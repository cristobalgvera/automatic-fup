import {IdStringArray, IdStringBooleanArray} from '.';
import {DB} from '../../config';
import {normalizeStringEmailsList} from '../../service/utility.service';

function getPurchaseVendorData() {
  const sheetId = '1LCWZozWjrVwrH43aJXdpWlo7V1jdRHUUmtNC6TAkXSk';
  const spreadsheet = SpreadsheetApp.openById(sheetId);
  const sheet = spreadsheet.getSheetByName('Proveedores-asignados');

  const vendorsByEmail = sheet
    .getDataRange()
    .getValues()
    .reduce((acc, [code, name, responsable, , , , , focal]) => {
      const emails = normalizeStringEmailsList(focal.toLocaleLowerCase());

      if (emails) {
        acc[emails[0]] ??= [];
        acc[emails[0]].push([code, name, responsable, ...emails]);
      }

      return acc;
    }, {} as {[email: string]: string[][]});

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

  const maxColumns = data.reduce(
    (max, arr) => (arr.length > max ? arr.length : max),
    0
  );

  const toInsertData = data.map(row => {
    for (let i = 0; i < maxColumns; i++) row[i] ??= null;

    return row;
  });

  return {emails, toInsertData};
}

export function updatePurchaseVendors() {
  const {emails, toInsertData} = getPurchaseVendorData();

  const generateId = (to: string) => `C - ${to}`;

  const vendorContacts: IdStringArray = emails
    .map(([to, name, cc]) => {
      const id = generateId(to);
      return [id, name, to, cc].map(String);
    })
    .reduce((acc, contact) => ({...acc, [contact[0]]: contact}), {});

  const linkedVendorNames: string[][] = toInsertData.map(
    ([vendorBp, division, , to]) => {
      const vendorId = generateId(to);
      return [vendorId, division, vendorBp, 'COMPRAS', ''].map(String);
    }
  );

  return {vendorContacts, linkedVendorNames};
}

export function exportPurchaseVendorData() {
  const {emails, toInsertData} = getPurchaseVendorData();

  const toPopulateSpreadsheetId =
    '1iWRK1BV2on5bGOmejjmKHqfCsQ7DDEeTE1AXBTRLg3E';
  const mySpreadsheet = SpreadsheetApp.openById(toPopulateSpreadsheetId);

  const purchasesSheet = mySpreadsheet.getSheetByName('COMPRAS');
  const contactSheet = mySpreadsheet.getSheetByName('CONTACTO');

  purchasesSheet
    .getRange(2, 1, toInsertData.length, toInsertData[0].length)
    .setValues(toInsertData);
  contactSheet
    .getRange(2, 1, emails.length, emails[0].length)
    .setValues(emails);

  SpreadsheetApp.flush();
}
