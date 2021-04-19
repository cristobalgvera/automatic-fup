import {normalizeStringEmailsList} from '../../service/utility.service';

export function exportPurchaseVendorData() {
  const sheetId = '1LCWZozWjrVwrH43aJXdpWlo7V1jdRHUUmtNC6TAkXSk';
  const spreadsheet = SpreadsheetApp.openById(sheetId);
  const sheet = spreadsheet.getSheetByName('Proveedores-asignados');

  const vendorTable = new Table(sheet.getDataRange(), undefined);

  const rows: string[][] = vendorTable.getGridValues();

  const vendorsByEmail = rows.reduce(
    (acc, [code, name, responsable, , , , , focal]) => {
      let emails = normalizeStringEmailsList(focal.toLocaleLowerCase());
      if (!emails) emails = ['NO_EMAIL_FOUND'];

      acc[emails[0]] ??= [];
      acc[emails[0]].push([code, name, responsable, ...emails]);
      return acc;
    },
    {} as {[email: string]: string[][]}
  );

  const data = Object.values(vendorsByEmail).flat();
  const emails = Object.keys(vendorsByEmail).map(email => {
    const row =
      data.find(
        ([, name, responsable, primaryEmail]) =>
          primaryEmail === email && (responsable || name)
      ) ?? [];
    const responsable = row[2] || row[1] || 'VENDOR';
    const [, , , , ...cc] = row;

    return [email, responsable, cc.join(',')];
  });

  const toPopulateSpreadsheetId =
    '1iWRK1BV2on5bGOmejjmKHqfCsQ7DDEeTE1AXBTRLg3E';
  const mySpreadsheet = SpreadsheetApp.openById(toPopulateSpreadsheetId);

  const purchasesSheet = mySpreadsheet.getSheetByName('COMPRAS');
  const contactSheet = mySpreadsheet.getSheetByName('CONTACTO');

  const maxColumns = data.reduce(
    (max, arr) => (arr.length > max ? arr.length : max),
    0
  );

  const toInsertData = data.map(row => {
    for (let i = 0; i < maxColumns; i++) row[i] = row[i] || null;

    return row;
  });

  purchasesSheet
    .getRange(2, 1, data.length, toInsertData[0].length)
    .setValues(toInsertData);
  contactSheet
    .getRange(2, 1, emails.length, emails[0].length)
    .setValues(emails);
}
