/* eslint-disable @typescript-eslint/no-unused-vars */

const SHEET_NAME = "points";
const HEADERS = ["id", "title", "description", "longitude", "latitude", "thumbnailUrl", "images", "updatedAt"];

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function getPointsSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  return sheet;
}

function isAuthorized(token) {
  const expected = PropertiesService.getScriptProperties().getProperty("API_TOKEN");
  return Boolean(expected && token && expected === token);
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
    images: images,
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

function upsertPoint(sheet, point) {
  if (!point || !point.id) throw new Error("El punto no tiene id.");
  const row = [
    point.id,
    point.title || "",
    point.description || "",
    Number(point.coordinates[0]),
    Number(point.coordinates[1]),
    point.thumbnailUrl || "",
    JSON.stringify(point.images || []),
    new Date(),
  ];
  const existingRow = findPointRow(sheet, point.id);
  if (existingRow) sheet.getRange(existingRow, 1, 1, HEADERS.length).setValues([row]);
  else sheet.appendRow(row);
}

function deletePoint(sheet, id) {
  const row = findPointRow(sheet, id);
  if (row) sheet.deleteRow(row);
}

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents || "{}");
    if (!isAuthorized(payload.token)) return jsonResponse({ ok: false, error: "No autorizado." });
    const sheet = getPointsSheet();

    if (payload.action === "list") return jsonResponse({ ok: true, points: listPoints(sheet) });
    if (payload.action === "upsert") {
      upsertPoint(sheet, payload.point);
      return jsonResponse({ ok: true });
    }
    if (payload.action === "delete") {
      deletePoint(sheet, payload.id);
      return jsonResponse({ ok: true });
    }
    return jsonResponse({ ok: false, error: "Acción inválida." });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error.message || error) });
  }
}
