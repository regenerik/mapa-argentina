/* eslint-disable @typescript-eslint/no-unused-vars */
/* Backend gratuito para Google Sheets + Cloudinary.
 * Pegar este archivo completo en Apps Script y configurar las Script Properties
 * indicadas en README.md. No colocar secretos en el frontend.
 */

const SHEET_NAME = "points";
const HEADERS = ["id", "title", "description", "longitude", "latitude", "thumbnailUrl", "images", "updatedAt"];

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function getScriptConfig() {
  const properties = PropertiesService.getScriptProperties();
  return {
    apiToken: properties.getProperty("API_TOKEN") || "",
    cloudName: properties.getProperty("CLOUDINARY_CLOUD_NAME") || "",
    cloudinaryApiKey: properties.getProperty("CLOUDINARY_API_KEY") || "",
    cloudinaryApiSecret: properties.getProperty("CLOUDINARY_API_SECRET") || "",
    allowedFolders: (properties.getProperty("CLOUDINARY_ALLOWED_FOLDERS") || "")
      .split(",")
      .map((folder) => folder.trim().replace(/^\/+|\/+$/g, ""))
      .filter(Boolean),
  };
}

function getPointsSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  return sheet;
}

function isAuthorized(token) {
  const expected = getScriptConfig().apiToken;
  return Boolean(expected && token && expected === String(token));
}

function rowToPoint(row) {
  let images = [];
  try { images = JSON.parse(row[6] || "[]"); } catch (error) { images = []; }
  return {
    id: String(row[0]),
    title: String(row[1] || ""),
    description: String(row[2] || ""),
    coordinates: [Number(row[3]), Number(row[4])],
    thumbnailUrl: String(row[5] || ""),
    images: Array.isArray(images) ? images : [],
  };
}

function listPoints(sheet) {
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues().map(rowToPoint);
}

function findPointRow(sheet, id) {
  if (sheet.getLastRow() < 2) return null;
  const match = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
    .createTextFinder(String(id))
    .matchEntireCell(true)
    .findNext();
  return match ? match.getRow() : null;
}

function getPointById(sheet, id) {
  const row = findPointRow(sheet, id);
  return row ? rowToPoint(sheet.getRange(row, 1, 1, HEADERS.length).getValues()[0]) : null;
}

function validatePoint(point) {
  if (!point || !point.id) throw new Error("El punto no tiene id.");
  if (!point.title || !point.description) throw new Error("Faltan título o descripción.");
  if (!Array.isArray(point.coordinates) || point.coordinates.length !== 2) throw new Error("La ubicación es inválida.");
  if (!point.thumbnailUrl) throw new Error("Falta la imagen principal.");
}

function upsertPoint(sheet, point) {
  validatePoint(point);
  const row = [
    String(point.id),
    String(point.title),
    String(point.description),
    Number(point.coordinates[0]),
    Number(point.coordinates[1]),
    String(point.thumbnailUrl),
    JSON.stringify(Array.isArray(point.images) ? point.images : []),
    new Date(),
  ];
  const existingRow = findPointRow(sheet, point.id);
  if (existingRow) sheet.getRange(existingRow, 1, 1, HEADERS.length).setValues([row]);
  else sheet.appendRow(row);
}

function cloudinaryPublicIdFromUrl(imageUrl) {
  if (!imageUrl || String(imageUrl).indexOf("res.cloudinary.com/") < 0) return null;
  const marker = "/image/upload/";
  const markerIndex = String(imageUrl).indexOf(marker);
  if (markerIndex < 0) return null;
  const path = String(imageUrl).slice(markerIndex + marker.length).split("?")[0];
  const segments = path.split("/");
  const versionIndex = segments.findIndex((segment) => /^v\d+$/.test(segment));
  const assetSegments = versionIndex >= 0 ? segments.slice(versionIndex + 1) : segments;
  if (!assetSegments.length) return null;
  assetSegments[assetSegments.length - 1] = assetSegments[assetSegments.length - 1].replace(/\.[^/.]+$/, "");
  return assetSegments.filter(Boolean).join("/") || null;
}

function pointAssetIds(point) {
  if (!point) return [];
  const ids = [];
  const thumbnailId = point.thumbnailPublicId || cloudinaryPublicIdFromUrl(point.thumbnailUrl);
  if (thumbnailId) ids.push(String(thumbnailId));
  (Array.isArray(point.images) ? point.images : []).forEach((image) => {
    const publicId = image.publicId || cloudinaryPublicIdFromUrl(image.imageUrl);
    if (publicId) ids.push(String(publicId));
  });
  return [...new Set(ids)];
}

function validateCloudinaryPublicIds(publicIds, config) {
  if (!config.cloudName || !config.cloudinaryApiKey || !config.cloudinaryApiSecret || !config.allowedFolders.length) {
    throw new Error("Falta completar la configuración de Cloudinary en Script Properties.");
  }
  publicIds.forEach((publicId) => {
    const allowed = config.allowedFolders.some((folder) => String(publicId).indexOf(folder + "/") === 0);
    if (!allowed) throw new Error("Se intentó eliminar una imagen fuera de las carpetas permitidas.");
  });
}

function sha1Hex(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, value, Utilities.Charset.UTF_8)
    .map((byte) => (byte < 0 ? byte + 256 : byte).toString(16).padStart(2, "0"))
    .join("");
}

function destroyCloudinaryAsset(publicId, config) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = sha1Hex(`invalidate=true&public_id=${publicId}&timestamp=${timestamp}${config.cloudinaryApiSecret}`);
  const response = UrlFetchApp.fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`, {
    method: "post",
    payload: {
      api_key: config.cloudinaryApiKey,
      invalidate: "true",
      public_id: publicId,
      signature: signature,
      timestamp: timestamp,
    },
    muteHttpExceptions: true,
  });
  const result = JSON.parse(response.getContentText() || "{}");
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300 || result.error) {
    throw new Error((result.error && result.error.message) || `Cloudinary no pudo eliminar ${publicId}.`);
  }
  return result.result || "ok";
}

function deleteCloudinaryAssets(publicIds) {
  const uniqueIds = [...new Set((Array.isArray(publicIds) ? publicIds : []).filter(Boolean).map(String))];
  if (!uniqueIds.length) return [];
  if (uniqueIds.length > 30) throw new Error("Demasiadas imágenes en una sola operación.");
  const config = getScriptConfig();
  validateCloudinaryPublicIds(uniqueIds, config);
  return uniqueIds.map((publicId) => ({ publicId: publicId, result: destroyCloudinaryAsset(publicId, config) }));
}

function withWriteLock(callback) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try { return callback(); } finally { lock.releaseLock(); }
}

function handleUpsert(sheet, point) {
  return withWriteLock(() => {
    const previousPoint = getPointById(sheet, point && point.id);
    const newAssetIds = new Set(pointAssetIds(point));
    const replacedAssetIds = pointAssetIds(previousPoint).filter((publicId) => !newAssetIds.has(publicId));
    upsertPoint(sheet, point);
    if (!replacedAssetIds.length) return { ok: true };
    try {
      deleteCloudinaryAssets(replacedAssetIds);
      return { ok: true };
    } catch (error) {
      return { ok: true, warning: "El punto se guardó, pero algunas imágenes reemplazadas no pudieron eliminarse." };
    }
  });
}

function handleDelete(sheet, id) {
  return withWriteLock(() => {
    const row = findPointRow(sheet, id);
    if (!row) return { ok: true };
    const point = rowToPoint(sheet.getRange(row, 1, 1, HEADERS.length).getValues()[0]);
    let warning = "";
    try {
      deleteCloudinaryAssets(pointAssetIds(point));
    } catch (error) {
      warning = `El punto se eliminó, pero Cloudinary no pudo limpiar sus imágenes: ${String(error.message || error)}`;
    }
    sheet.deleteRow(row);
    return { ok: true, warning: warning || undefined };
  });
}

function doGet() {
  return jsonResponse({ ok: true, service: "mapa-argentina" });
}

function doPost(event) {
  try {
    const payload = JSON.parse((event.postData && event.postData.contents) || "{}");
    if (payload.action === "list") return jsonResponse({ ok: true, points: listPoints(getPointsSheet()) });
    if (!isAuthorized(payload.token)) return jsonResponse({ ok: false, error: "Clave administrativa incorrecta." });
    if (payload.action === "authorize") return jsonResponse({ ok: true });
    if (payload.action === "upsert") return jsonResponse(handleUpsert(getPointsSheet(), payload.point));
    if (payload.action === "delete") return jsonResponse(handleDelete(getPointsSheet(), payload.id));
    if (payload.action === "deleteCloudinaryAssets") {
      return jsonResponse({ ok: true, deleted: deleteCloudinaryAssets(payload.publicIds) });
    }
    return jsonResponse({ ok: false, error: "Acción inválida." });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error.message || error) });
  }
}
