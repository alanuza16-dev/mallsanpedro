/**
 * Automatización para la hoja de respuestas de Tómbola de diciembre.
 *
 * Uso: pegar este archivo en Extensiones > Apps Script de la hoja vinculada,
 * guardar y ejecutar instalarTrigger() una sola vez. El formulario sigue siendo
 * la fuente de captura; este script solo prepara la revisión posterior.
 */
const TOMBOLA_CONFIG = {
  responseSheetName: 'Respuestas de formulario 1',
  catalogSheetName: 'Catalogo',
  responseColumns: {
    business: ['Negocio', 'Comercio', 'Negocio patrocinador', 'Identificador de negocio'],
    series: ['Serie / sucursal', 'Serie/sucursal', 'Serie'],
    invoice: ['Identificador completo de factura', 'Factura', 'Número de factura'],
    amount: ['Monto en colones', 'Monto', 'Importe', 'Monto de la factura en colones', 'Monto de compra en colones'],
  },
  reviewHeaders: ['Clave factura', 'Coincidencias', 'Multiplicador', 'Tickets calculados', 'Estado revisión', 'Motivo revisión', 'Responsable', 'Fecha revisión'],
};

/**
 * Devuelve las filas de revisión para que la interfaz pueda actualizarlas.
 * Al publicar como aplicación web, usar el URL /exec en la interfaz.
 */
function doGet() {
  const sheet = SpreadsheetApp.openById('1oPV7A6Coi4znauBRDx7pES4KHqNsk7qcEOStQpbpDIo').getSheetByName(TOMBOLA_CONFIG.responseSheetName) || SpreadsheetApp.getActiveSheet();
  prepararHoja_(sheet);
  recalcularCoincidencias_(sheet);
  const values = sheet.getDataRange().getDisplayValues();
  const headers = values.shift().map(String);
  const rows = values.filter(function(row) { return row.some(function(cell) { return cell !== ''; }); }).map(function(row, i) {
    const item = { row: i + 2 };
    headers.forEach(function(header, col) { item[header] = row[col] || ''; });
    return item;
  });
  return ContentService.createTextOutput(JSON.stringify({ updatedAt: new Date().toISOString(), rows: rows }))
    .setMimeType(ContentService.MimeType.JSON);
}

function instalarTrigger() {
  const ss = SpreadsheetApp.openById('1oPV7A6Coi4znauBRDx7pES4KHqNsk7qcEOStQpbpDIo');
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'onFormSubmit') ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('onFormSubmit').forSpreadsheet('1oPV7A6Coi4znauBRDx7pES4KHqNsk7qcEOStQpbpDIo').onFormSubmit().create();
  prepararHoja_(ss.getSheetByName(TOMBOLA_CONFIG.responseSheetName) || ss.getActiveSheet());
}

function onFormSubmit(e) {
  const sheet = e.range.getSheet();
  if (sheet.getName() !== TOMBOLA_CONFIG.responseSheetName) return;
  prepararHoja_(sheet);
  recalcularCoincidencias_(sheet);
}

function prepararHoja_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const missing = TOMBOLA_CONFIG.reviewHeaders.filter(function(h) { return headers.indexOf(h) < 0; });
  if (missing.length) sheet.getRange(1, sheet.getLastColumn() + 1, 1, missing.length).setValues([missing]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight('bold');
}

function recalcularCoincidencias_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return;
  const headers = values[0].map(String);
  const idx = function(names) { return names.map(function(n) { return headers.indexOf(n); }).find(function(i) { return i >= 0; }); };
  const businessCol = idx(TOMBOLA_CONFIG.responseColumns.business);
  const seriesCol = idx(TOMBOLA_CONFIG.responseColumns.series);
  const invoiceCol = idx(TOMBOLA_CONFIG.responseColumns.invoice);
  const amountCol = idx(TOMBOLA_CONFIG.responseColumns.amount);
  if ([businessCol, seriesCol, invoiceCol, amountCol].some(function(i) { return i === undefined; })) return;

  const review = {};
  TOMBOLA_CONFIG.reviewHeaders.forEach(function(h) { review[h] = headers.indexOf(h); });
  const catalog = cargarCatalogo_();
  const records = values.slice(1).map(function(row, offset) {
    const key = normalizar_(row[businessCol]) + '|' + normalizar_(row[seriesCol]) + '|' + normalizar_(row[invoiceCol]);
    const multiplier = catalog[normalizar_(row[businessCol])] || 1;
    const amount = Number(String(row[amountCol]).replace(/[^0-9.-]/g, '')) || 0;
    return { row: offset + 2, key: key, multiplier: multiplier, tickets: Math.floor(amount / 10000) * multiplier };
  });
  const counts = records.reduce(function(acc, r) { acc[r.key] = (acc[r.key] || 0) + 1; return acc; }, {});

  records.forEach(function(r) {
    const duplicateCount = counts[r.key];
    const status = duplicateCount > 1 ? 'Pendiente · coincidencia' : 'Pendiente';
    const reason = duplicateCount > 1 ? 'Hay ' + duplicateCount + ' envíos con la misma clave; revisar todos antes de aprobar.' : 'Pendiente de contraste del comprobante.';
    const rowValues = [];
    rowValues[review['Clave factura']] = r.key;
    rowValues[review['Coincidencias']] = duplicateCount;
    rowValues[review['Multiplicador']] = r.multiplier;
    rowValues[review['Tickets calculados']] = r.tickets;
    rowValues[review['Estado revisión']] = status;
    rowValues[review['Motivo revisión']] = reason;
    rowValues[review['Responsable']] = '';
    rowValues[review['Fecha revisión']] = '';
    Object.keys(review).forEach(function(h) {
      if (review[h] >= 0) sheet.getRange(r.row, review[h] + 1).setValue(rowValues[review[h]] || '');
    });
  });
}

function marcarAprobada() {
  const sheet = SpreadsheetApp.openById('1oPV7A6Coi4znauBRDx7pES4KHqNsk7qcEOStQpbpDIo').getSheetByName(TOMBOLA_CONFIG.responseSheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const statusCol = headers.indexOf('Estado revisión') + 1;
  const ownerCol = headers.indexOf('Responsable') + 1;
  const dateCol = headers.indexOf('Fecha revisión') + 1;
  if (!statusCol) throw new Error('Ejecute instalarTrigger() primero.');
  const row = sheet.getActiveRange().getRow();
  if (row <= 1) return;
  sheet.getRange(row, statusCol).setValue('Aprobada');
  if (ownerCol) sheet.getRange(row, ownerCol).setValue(Session.getActiveUser().getEmail() || 'Organizador');
  if (dateCol) sheet.getRange(row, dateCol).setValue(new Date());
}

function cargarCatalogo_() {
  const sheet = SpreadsheetApp.openById('1oPV7A6Coi4znauBRDx7pES4KHqNsk7qcEOStQpbpDIo').getSheetByName(TOMBOLA_CONFIG.catalogSheetName);
  if (!sheet || sheet.getLastRow() < 2) return {};
  const rows = sheet.getDataRange().getValues();
  const headers = rows.shift().map(String);
  const nameCol = headers.indexOf('Negocio') >= 0 ? headers.indexOf('Negocio') : headers.indexOf('ID');
  const multCol = headers.indexOf('Multiplicador');
  return rows.reduce(function(acc, row) {
    if (nameCol >= 0 && multCol >= 0) acc[normalizar_(row[nameCol])] = Number(row[multCol]) || 1;
    return acc;
  }, {});
}

function normalizar_(value) {
  return String(value == null ? '' : value).normalize('NFKC').trim().toUpperCase().replace(/[\s-]+/g, '');
}

