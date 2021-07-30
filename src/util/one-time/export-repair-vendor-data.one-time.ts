import {IdStringArray} from './worker/export-vendor-data.worker';
import {DB} from '../../config';
import {normalizeStringEmailsList} from '../../service/utility.service';

function getRepairVendorData() {
  const sheetId = '1QiF1G7XHSRf64pK7PJ_ojN-IF1a1Yleo59XMwkVq5zA';
  const spreadsheet = SpreadsheetApp.openById(sheetId);
  const sheet = spreadsheet.getSheetByName('ASIGNACION VENDOR');

  const rows: string[][] = sheet
    .getDataRange()
    .getValues()
    .filter(
      row =>
        normalizeStringEmailsList(row[10]) || normalizeStringEmailsList(row[11])
    );

  const vendorsByEmail = rows.reduce(
    (acc, [name, code, , , , , , , , , sscContact, braContact, standard]) => {
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
        ssc[sscEmails[0]].push([code, name, standard, 'SSC', ...sscEmails]);
      }

      if (braEmails) {
        bra[braEmails[0]] ??= [];
        bra[braEmails[0]].push([code, name, standard, 'BRA', ...braEmails]);
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
        ([, name, standard, , primaryEmail]) =>
          primaryEmail === email && (standard || name)
      ) ?? [];
    const responsable = row[1] || row[2] || 'VENDOR';
    const [, , , , , ...cc] = row;

    return [email, responsable, cc.join(','), 'SSC'];
  });

  const maxColumnsSsc = sscData.reduce(
    (max, arr) => (arr.length > max ? arr.length : max),
    0
  );

  const toInsertSscData = sscData.map(row => {
    for (let i = 0; i < maxColumnsSsc; i++) row[i] ??= null;

    return row;
  });

  const braData = Object.values(braVendorsByEmail).flat();

  const braEmails = Object.keys(braVendorsByEmail).map(email => {
    const row =
      braData.find(
        ([, name, standard, , primaryEmail]) =>
          primaryEmail === email && (standard || name)
      ) ?? [];
    const responsable = row[1] || row[2] || 'VENDOR';
    const [, , , , , ...cc] = row;

    return [email, responsable, cc.join(','), 'BRA'];
  });

  const maxColumnsBra = braData.reduce(
    (max, arr) => (arr.length > max ? arr.length : max),
    0
  );
  const toInsertBraData = braData.map(row => {
    for (let i = 0; i < maxColumnsBra; i++) row[i] ??= null;

    return row;
  });

  return {
    emails: [...sscEmails, ...braEmails],
    toInsertData: [...toInsertSscData, ...toInsertBraData],
    detail: {
      sscEmails,
      toInsertSscData,
      braEmails,
      toInsertBraData,
    },
  };
}

export function updateRepairVendors() {
  const {emails, toInsertData} = getRepairVendorData();

  const generateId = (to: string) => `R - ${to}`;

  // Contacts
  const vendorContacts: IdStringArray = emails
    .map(([to, name, cc]) => {
      const id = generateId(to);
      return [id, name, to, cc].map(String);
    })
    .reduce((acc, contact) => ({...acc, [contact[0]]: contact}), {});

  const linkedVendorNames: string[][] = toInsertData.map(
    ([vendorBp, division, , zone, to]) => {
      const vendorId = generateId(to);
      return [vendorId, division, vendorBp, 'REPARACIONES', zone].map(String);
    }
  );

  return {vendorContacts, linkedVendorNames};
}

export function exportRepairVendorData() {
  const {
    detail: {sscEmails, toInsertSscData, braEmails, toInsertBraData},
  } = getRepairVendorData();

  const toPopulateSpreadsheetId =
    '1iWRK1BV2on5bGOmejjmKHqfCsQ7DDEeTE1AXBTRLg3E';
  const mySpreadsheet = SpreadsheetApp.openById(toPopulateSpreadsheetId);

  const sscRepairsSheet = mySpreadsheet.getSheetByName('REPARACIONES SSC');
  const sscContactSheet = mySpreadsheet.getSheetByName('CONTACTO SSC');

  sscRepairsSheet
    .getRange(2, 1, toInsertSscData.length, toInsertSscData[0].length)
    .setValues(toInsertSscData);
  sscContactSheet
    .getRange(2, 1, sscEmails.length, sscEmails[0].length)
    .setValues(sscEmails);

  const braRepairsSheet = mySpreadsheet.getSheetByName('REPARACIONES BRA');
  const braContactSheet = mySpreadsheet.getSheetByName('CONTACTO BRA');

  braRepairsSheet
    .getRange(2, 1, toInsertBraData.length, toInsertBraData[0].length)
    .setValues(toInsertBraData);
  braContactSheet
    .getRange(2, 1, braEmails.length, braEmails[0].length)
    .setValues(braEmails);

  SpreadsheetApp.flush();
}
