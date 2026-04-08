// ============================================================
// Downhill Training Tracker — Google Apps Script v3
// ============================================================

var SHEET_NAME = 'SessionLogs';
var HEADERS = ['sessionId','status','feeling','note','ticked','loggedAt','updatedAt'];

function doGet(e) {
  var action = e.parameter.action;
  var result;
  try {
    if (action === 'getLogs')        result = getLogs();
    else if (action === 'saveLog')   result = saveLog(e.parameter);
    else if (action === 'deleteLog') result = deleteLog(e.parameter.sessionId);
    else result = {error: 'Unknown action: ' + action};
  } catch(err) {
    result = {error: err.toString()};
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    var hr = sheet.getRange(1, 1, 1, HEADERS.length);
    hr.setBackground('#2C2C2A');
    hr.setFontColor('#ffffff');
    hr.setFontWeight('bold');
  } else {
    var existing = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var hasTickedCol = false;
    for (var x = 0; x < existing.length; x++) {
      if (existing[x] === 'ticked') { hasTickedCol = true; break; }
    }
    if (!hasTickedCol) {
      sheet.insertColumnAfter(4);
      sheet.getRange(1, 5).setValue('ticked');
    }
  }
  return sheet;
}

function getColIndex(headers) {
  var col = {};
  for (var i = 0; i < headers.length; i++) {
    col[headers[i]] = i;
  }
  return col;
}

function getLogs() {
  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return {logs: {}};
  var col = getColIndex(data[0]);
  var logs = {};

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var sid = row[col['sessionId']];
    if (!sid) continue;

    var ticked = {};
    try {
      var rawTicked = decodeURIComponent(row[col['ticked']] || '');
      if (rawTicked.length > 0) {
        var keys = rawTicked.split(',');
        for (var k = 0; k < keys.length; k++) {
          var key = keys[k].trim();
          if (key) ticked[key] = 1;
        }
      }
    } catch(e) {}

    logs[sid] = {
      sessionId: sid,
      status:    row[col['status']]   || '',
      feeling:   row[col['feeling']]  || '',
      note:      decodeURIComponent(row[col['note']] || ''),
      ticked:    ticked,
      loggedAt:  row[col['loggedAt']] || '',
      updatedAt: row[col['updatedAt']]|| ''
    };
  }
  return {logs: logs};
}

function saveLog(params) {
  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();
  var col = getColIndex(data[0]);
  var now = new Date().toISOString();
  var sessionId = params.sessionId;
  var numCols = HEADERS.length;

  for (var i = 1; i < data.length; i++) {
    if (data[i][col['sessionId']] === sessionId) {
      var row = [];
      for (var j = 0; j < numCols; j++) row.push('');
      row[col['sessionId']] = sessionId;
      row[col['status']]    = params.status   || '';
      row[col['feeling']]   = params.feeling  || '';
      row[col['note']]      = params.note     || '';
      row[col['ticked']]    = decodeURIComponent(params.ticked || '');
      row[col['loggedAt']]  = data[i][col['loggedAt']] || now;
      row[col['updatedAt']] = now;
      sheet.getRange(i + 1, 1, 1, numCols).setValues([row]);
      return {success: true, updated: true};
    }
  }

  var newRow = [];
  for (var j = 0; j < numCols; j++) newRow.push('');
  newRow[col['sessionId']] = sessionId;
  newRow[col['status']]    = params.status   || '';
  newRow[col['feeling']]   = params.feeling  || '';
  newRow[col['note']]      = params.note     || '';
  newRow[col['ticked']]    = decodeURIComponent(params.ticked || '');
  newRow[col['loggedAt']]  = now;
  newRow[col['updatedAt']] = now;
  sheet.appendRow(newRow);
  return {success: true, updated: false};
}

function deleteLog(sessionId) {
  var sheet = getSheet();
  var data = sheet.getDataRange().getValues();
  var col = getColIndex(data[0]);
  for (var i = 1; i < data.length; i++) {
    if (data[i][col['sessionId']] === sessionId) {
      sheet.deleteRow(i + 1);
      return {success: true};
    }
  }
  return {success: false, error: 'Not found'};
}
