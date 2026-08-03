/* eslint-disable @typescript-eslint/no-unused-vars */
/* Backend gratuito para Google Sheets + Cloudinary.
 * Pegar este archivo completo en Apps Script y configurar las Script Properties
 * indicadas en README.md. No colocar secretos en el frontend.
 */

const POINTS_SHEET_NAME = "points";
const WEEDS_SHEET_NAME = "target_weeds";
const SETTINGS_SHEET_NAME = "settings";

const POINT_HEADERS = [
  "id",
  "title",
  "description",
  "longitude",
  "latitude",
  "thumbnailUrl",
  "images",
  "targetWeeds",
  "province",
  "locality",
  "advisor",
  "dose",
  "updatedAt",
];

const DEFAULT_TARGET_WEEDS = [
  "Rama negra - Conyza bonariensis/sumatrensis",
  "Yuyo colorado - Amaranthus hybridus",
  "Brachiaria - Urochloa panicoides",
  "Capin - Echinochloa colona",
  "Cloris - Chloris virgata",
  "Pata de gallina - Eleusine indica",
  "Pasto cuaresma - Digitaria sanguinalis",
  "Rye Grass - Lolium multiflorum",
  "Maiz voluntario - Zea mays",
  "Mani voluntario - Arachis hypogaea",
];

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

function getOrCreateSheet(name, headers) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  ensureHeaders(sheet, headers);
  return sheet;
}

function ensureHeaders(sheet, headers) {
  const existing = sheet.getLastColumn() > 0
    ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String)
    : [];
  headers.forEach((header) => {
    if (!existing.includes(header)) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
      existing.push(header);
    }
  });
}

function headerMap(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .reduce((map, header, index) => {
      map[String(header)] = index;
      return map;
    }, {});
}

function getPointsSheet() {
  return getOrCreateSheet(POINTS_SHEET_NAME, POINT_HEADERS);
}

function getWeedsSheet() {
  const sheet = getOrCreateSheet(WEEDS_SHEET_NAME, ["name"]);
  if (sheet.getLastRow() < 2) {
    sheet.getRange(2, 1, DEFAULT_TARGET_WEEDS.length, 1).setValues(DEFAULT_TARGET_WEEDS.map((weed) => [weed]));
  }
  return sheet;
}

function getSettingsSheet() {
  const sheet = getOrCreateSheet(SETTINGS_SHEET_NAME, ["key", "value"]);
  if (!getSetting("filtersEnabled")) setSetting("filtersEnabled", "false");
  return sheet;
}

function getSetting(key) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(SETTINGS_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return "";
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  const row = values.find((current) => String(current[0]) === key);
  return row ? String(row[1]) : "";
}

function setSetting(key, value) {
  const sheet = getOrCreateSheet(SETTINGS_SHEET_NAME, ["key", "value"]);
  if (sheet.getLastRow() >= 2) {
    const match = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
      .createTextFinder(String(key))
      .matchEntireCell(true)
      .findNext();
    if (match) {
      sheet.getRange(match.getRow(), 2).setValue(String(value));
      return;
    }
  }
  sheet.appendRow([String(key), String(value)]);
}

function getFiltersEnabled() {
  getSettingsSheet();
  return getSetting("filtersEnabled") === "true";
}

function listTargetWeeds() {
  const sheet = getWeedsSheet();
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues()
    .flat()
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function isAuthorized(token) {
  const expected = getScriptConfig().apiToken;
  return Boolean(expected && token && expected === String(token));
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function normalizeImage(image, index) {
  const daysFromBase = Math.max(0, Math.round(Number(image.daysFromBase ?? image.day ?? index) || 0));
  return {
    day: String(daysFromBase),
    daysFromBase: daysFromBase,
    title: image.title ? String(image.title) : "",
    imageUrl: String(image.imageUrl || ""),
    publicId: image.publicId ? String(image.publicId) : undefined,
    isBase: Boolean(image.isBase),
  };
}

function rowToPoint(row, headers) {
  const get = (name) => row[headers[name]] ?? "";
  const images = parseJsonArray(get("images"))
    .filter((image) => image && image.imageUrl)
    .map(normalizeImage)
    .sort((a, b) => a.daysFromBase - b.daysFromBase);
  return {
    id: String(get("id")),
    title: String(get("title") || ""),
    description: String(get("description") || ""),
    coordinates: [Number(get("longitude")), Number(get("latitude"))],
    thumbnailUrl: String(get("thumbnailUrl") || ""),
    images: images,
    targetWeeds: parseJsonArray(get("targetWeeds")).map(String).filter(Boolean),
    province: String(get("province") || ""),
    locality: String(get("locality") || ""),
    advisor: String(get("advisor") || ""),
    dose: String(get("dose") || ""),
  };
}

function listPoints(sheet) {
  if (sheet.getLastRow() < 2) return [];
  const headers = headerMap(sheet);
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues()
    .map((row) => rowToPoint(row, headers))
    .filter((point) => point.id);
}

function findPointRow(sheet, id) {
  if (sheet.getLastRow() < 2) return null;
  const headers = headerMap(sheet);
  const idColumn = headers.id + 1;
  const match = sheet.getRange(2, idColumn, sheet.getLastRow() - 1, 1)
    .createTextFinder(String(id))
    .matchEntireCell(true)
    .findNext();
  return match ? match.getRow() : null;
}

function getPointById(sheet, id) {
  const row = findPointRow(sheet, id);
  return row ? rowToPoint(sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0], headerMap(sheet)) : null;
}

function validatePoint(point) {
  if (!point || !point.id) throw new Error("El punto no tiene id.");
  if (!point.title || !point.description) throw new Error("Faltan titulo o descripcion.");
  if (!Array.isArray(point.coordinates) || point.coordinates.length !== 2) throw new Error("La ubicacion es invalida.");
  if (!point.thumbnailUrl) throw new Error("Falta la imagen principal.");
  if (!Array.isArray(point.targetWeeds) || point.targetWeeds.length === 0) throw new Error("Falta seleccionar malezas target.");
  if (!point.province) throw new Error("Falta seleccionar provincia.");
  if (!Array.isArray(point.images) || point.images.length === 0) throw new Error("Falta cargar al menos la foto base.");
}

function upsertPoint(sheet, point) {
  validatePoint(point);
  const images = point.images
    .filter((image) => image && image.imageUrl)
    .map(normalizeImage)
    .sort((a, b) => a.daysFromBase - b.daysFromBase);

  const rowByHeader = {
    id: String(point.id),
    title: String(point.title),
    description: String(point.description),
    longitude: Number(point.coordinates[0]),
    latitude: Number(point.coordinates[1]),
    thumbnailUrl: String(point.thumbnailUrl),
    images: JSON.stringify(images),
    targetWeeds: JSON.stringify(Array.isArray(point.targetWeeds) ? point.targetWeeds : []),
    province: String(point.province || ""),
    locality: String(point.locality || ""),
    advisor: String(point.advisor || ""),
    dose: String(point.dose || ""),
    updatedAt: new Date(),
  };

  const headers = headerMap(sheet);
  const row = Object.keys(headers).map((header) => rowByHeader[header] ?? "");
  const existingRow = findPointRow(sheet, point.id);
  if (existingRow) sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
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
    throw new Error("Falta completar la configuracion de Cloudinary en Script Properties.");
  }
  publicIds.forEach((publicId) => {
    const allowed = config.allowedFolders.some((folder) => String(publicId).indexOf(folder + "/") === 0);
    if (!allowed) throw new Error("Se intento eliminar una imagen fuera de las carpetas permitidas.");
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
  if (uniqueIds.length > 30) throw new Error("Demasiadas imagenes en una sola operacion.");
  const config = getScriptConfig();
  validateCloudinaryPublicIds(uniqueIds, config);
  return uniqueIds.map((publicId) => ({ publicId: publicId, result: destroyCloudinaryAsset(publicId, config) }));
}

function withWriteLock(callback) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try { return callback(); } finally { lock.releaseLock(); }
}

function catalogPayload() {
  return {
    targetWeeds: listTargetWeeds(),
    filtersEnabled: getFiltersEnabled(),
  };
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
      return { ok: true, warning: "El punto se guardo, pero algunas imagenes reemplazadas no pudieron eliminarse." };
    }
  });
}

function handleDelete(sheet, id) {
  return withWriteLock(() => {
    const row = findPointRow(sheet, id);
    if (!row) return { ok: true };
    const point = rowToPoint(sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0], headerMap(sheet));
    let warning = "";
    try {
      deleteCloudinaryAssets(pointAssetIds(point));
    } catch (error) {
      warning = `El punto se elimino, pero Cloudinary no pudo limpiar sus imagenes: ${String(error.message || error)}`;
    }
    sheet.deleteRow(row);
    return { ok: true, warning: warning || undefined };
  });
}

/**
 * Ejecutar manualmente una vez desde el editor de Apps Script.
 * La solicitud es inocua y fuerza a Google a pedir el permiso
 * script.external_request que necesita la limpieza de Cloudinary.
 */
function authorizeExternalRequests() {
  const response = UrlFetchApp.fetch("https://api.cloudinary.com", {
    method: "get",
    muteHttpExceptions: true,
  });
  return `Permiso para solicitudes externas habilitado (${response.getResponseCode()}).`;
}

/**
 * Ejecutar manualmente una vez despues de pegar el script.
 * Crea points, target_weeds y settings con sus encabezados.
 */
function setupSheets() {
  getPointsSheet();
  getWeedsSheet();
  getSettingsSheet();
  return "Hojas inicializadas.";
}

function doGet() {
  setupSheets();
  return jsonResponse({ ok: true, service: "mapa-argentina", ...catalogPayload() });
}

function doPost(event) {
  try {
    setupSheets();
    const payload = JSON.parse((event.postData && event.postData.contents) || "{}");
    if (payload.action === "list") return jsonResponse({ ok: true, points: listPoints(getPointsSheet()), ...catalogPayload() });
    if (!isAuthorized(payload.token)) return jsonResponse({ ok: false, error: "Clave administrativa incorrecta." });
    if (payload.action === "authorize") return jsonResponse({ ok: true, ...catalogPayload() });
    if (payload.action === "upsert") return jsonResponse(handleUpsert(getPointsSheet(), payload.point));
    if (payload.action === "delete") return jsonResponse(handleDelete(getPointsSheet(), payload.id));
    if (payload.action === "setFiltersEnabled") {
      setSetting("filtersEnabled", payload.filtersEnabled ? "true" : "false");
      return jsonResponse({ ok: true, ...catalogPayload() });
    }
    if (payload.action === "deleteCloudinaryAssets") {
      return jsonResponse({ ok: true, deleted: deleteCloudinaryAssets(payload.publicIds) });
    }
    return jsonResponse({ ok: false, error: "Accion invalida." });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error.message || error) });
  }
}
