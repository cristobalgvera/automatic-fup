import {normalizeStringEmailsList} from '../../service/utility.service';

export function exportRepairVendorData() {
  const sheetId = '1QiF1G7XHSRf64pK7PJ_ojN-IF1a1Yleo59XMwkVq5zA';
  const spreadsheet = SpreadsheetApp.openById(sheetId);
  const sheet = spreadsheet.getSheetByName('ASIGNACION VENDOR');

  const rows: string[][] = sheet
    .getDataRange()
    .getValues()
    .filter(
      row =>
        normalizeStringEmailsList(row[9]) || normalizeStringEmailsList(row[10])
    );

  const vendorsByEmail = rows.reduce(
    (acc, [name, code, , , , , , , , sscContact, braContact, standard]) => {
      const sscEmails = normalizeStringEmailsList(
        sscContact.toLocaleLowerCase()
      );
      const braEmails = normalizeStringEmailsList(
        braContact.toLocaleLowerCase()
      );

      const ssc = acc.ssc;
      const bra = acc.bra;

      if (sscEmails) {
        ssc[sscEmails[0]] ??= [];
        ssc[sscEmails[0]].push([code, name, standard, ...sscEmails]);
      }

      if (braEmails) {
        bra[braEmails[0]] ??= [];
        bra[braEmails[0]].push([code, name, standard, ...braEmails]);
      }

      return {ssc, bra};
    },
    {ssc: {}, bra: {}} as {
      [zone: string]: {[email: string]: string[][]};
    }
  );

  const [sscVendorsByEmail, braVendorsByEmail] = Object.values(vendorsByEmail);
  const sscData = Object.values(sscVendorsByEmail).flat();

  const sscEmails = Object.keys(sscVendorsByEmail).map(email => {
    const row =
      sscData.find(
        ([, name, standard, primaryEmail]) =>
          primaryEmail === email && (standard || name)
      ) ?? [];
    const responsable = row[1] || row[2] || 'VENDOR';
    const [, , , , ...cc] = row;

    return ['SSC', email, responsable, cc.join(',')];
  });

  const toPopulateSpreadsheetId =
    '1iWRK1BV2on5bGOmejjmKHqfCsQ7DDEeTE1AXBTRLg3E';
  const mySpreadsheet = SpreadsheetApp.openById(toPopulateSpreadsheetId);

  const sscRepairsSheet = mySpreadsheet.getSheetByName('REPARACIONES SSC');
  const sscContactSheet = mySpreadsheet.getSheetByName('CONTACTO SSC');

  const maxColumnsSsc = sscData.reduce(
    (max, arr) => (arr.length > max ? arr.length : max),
    0
  );

  const toInsertSscData = sscData.map(row => {
    for (let i = 0; i < maxColumnsSsc; i++) row[i] = row[i] || null;

    return row;
  });

  sscRepairsSheet
    .getRange(2, 1, sscData.length, toInsertSscData[0].length)
    .setValues(toInsertSscData);
  sscContactSheet
    .getRange(2, 1, sscEmails.length, sscEmails[0].length)
    .setValues(sscEmails);

  const braData = Object.values(braVendorsByEmail).flat();

  const braEmails = Object.keys(braVendorsByEmail).map(email => {
    const row =
      braData.find(
        ([, name, standard, primaryEmail]) =>
          primaryEmail === email && (standard || name)
      ) ?? [];
    const responsable = row[1] || row[2] || 'VENDOR';
    const [, , , , ...cc] = row;

    return ['BRA', email, responsable, cc.join(',')];
  });
  const braRepairsSheet = mySpreadsheet.getSheetByName('REPARACIONES BRA');

  const braContactSheet = mySpreadsheet.getSheetByName('CONTACTO BRA');

  const maxColumnsBra = braData.reduce(
    (max, arr) => (arr.length > max ? arr.length : max),
    0
  );
  const toInsertBraData = braData.map(row => {
    for (let i = 0; i < maxColumnsBra; i++) row[i] = row[i] || null;

    return row;
  });

  braRepairsSheet
    .getRange(2, 1, braData.length, toInsertBraData[0].length)
    .setValues(toInsertBraData);
  braContactSheet
    .getRange(2, 1, braEmails.length, braEmails[0].length)
    .setValues(braEmails);

  SpreadsheetApp.flush();
}
