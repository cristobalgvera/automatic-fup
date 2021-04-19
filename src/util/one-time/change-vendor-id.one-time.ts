export function changeVendorId() {
  const spreadsheetId = '1iWRK1BV2on5bGOmejjmKHqfCsQ7DDEeTE1AXBTRLg3E';
  const sheetName = 'REPARACIONES BRA';
  const toUnshift = 'R - ';
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(
    sheetName
  );
  const range = sheet.getRange(2, 3, sheet.getLastRow() - 1);
  const data = range
    .getValues()
    .map(([id]) => (id !== 'NO_EMAIL_FOUND' ? [`${toUnshift}${id}`] : [id]));
  range.setValues(data);
}
