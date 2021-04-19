export function changeVendorId(
  toUnshift: string,
  sheetName = 'REPARACIONES BRA',
  spreadsheetId = '1iWRK1BV2on5bGOmejjmKHqfCsQ7DDEeTE1AXBTRLg3E'
) {
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(
    sheetName
  );
  const range = sheet.getRange(2, 3, sheet.getLastRow() - 1);
  const data = range
    .getValues()
    .map(([id]) => (id !== 'NO_EMAIL_FOUND' ? [`${toUnshift}${id}`] : [id]));
  range.setValues(data);
}
