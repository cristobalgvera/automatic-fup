import {DB} from '../../config';

function _getConfigs() {
  const spreadsheet = SpreadsheetApp.openById(DB.ID);
  const sheet = spreadsheet.getSheetByName(DB.SHEET.CONFIG);
  const configs: (boolean | string)[][] = sheet.getDataRange().getValues();

  const headers = configs.splice(0, 1)[0];
  const stateCol = headers.indexOf(DB.UTIL.CONFIG.COLUMN.STATE);
  const featureCol = headers.indexOf(DB.UTIL.CONFIG.COLUMN.FEATURE);

  return {sheet, data: {configs, headers}, columns: {stateCol, featureCol}};
}

function _toggleAutomaticFeature(feature: string, state?: boolean) {
  const {
    sheet,
    data: {configs},
    columns: {stateCol, featureCol},
  } = _getConfigs();

  const rowNumber = configs.findIndex(
    config => config[featureCol] === String(feature)
  );

  if (rowNumber === -1) return;

  // +1 due to zero-based array, +1 due to headers less array
  sheet.getRange(rowNumber + 2, stateCol + 1).setValue(!!state);
}

export {_getConfigs, _toggleAutomaticFeature};
