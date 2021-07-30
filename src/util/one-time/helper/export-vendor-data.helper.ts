import {DB} from '../../../config';
import {
  IdStringArray,
  IdStringBooleanArray,
} from '../worker/export-vendor-data.worker';

type Sheet = GoogleAppsScript.Spreadsheet.Sheet;
type Config = {clearContentFirst: boolean};

export function _persistVendorData({
  vendorContacts,
  linkedVendorNames,
}: {
  vendorContacts: IdStringArray;
  linkedVendorNames: string[][];
}) {
  const spreadsheet = SpreadsheetApp.openById(DB.ID);
  const vendorContactsSheet = spreadsheet.getSheetByName(DB.SHEET.VENDOR);

  const currentVendorContacts: (string | boolean)[][] = vendorContactsSheet
    .getDataRange()
    .getValues();

  const updatedCurrentVendorContacts: IdStringBooleanArray =
    currentVendorContacts.reduce(
      (acc, contact) => ({...acc, [contact[0] as string]: contact}),
      {}
    );

  Object.entries(vendorContacts).forEach(([id, contact]) => {
    const type = id.startsWith('C') ? 'COMPRAS' : 'REPARACIONES';
    const defaultInitialContactOptions = [null, true, type, true];

    updatedCurrentVendorContacts[id] = [
      ...contact,
      ...(updatedCurrentVendorContacts[id]?.slice(contact.length) ??
        defaultInitialContactOptions),
    ];
  });

  const updatedVendorContacts = Object.values(updatedCurrentVendorContacts);

  const types = ['COMPRAS', 'REPARACIONES'];

  const linkedVendorNamesSheet = spreadsheet.getSheetByName(
    DB.SHEET.LINKED_VENDOR_NAME
  );

  const currentLinkedVendorNames = linkedVendorNamesSheet
    .getDataRange()
    .getValues();

  const updatedLinkedVendorNames: string[][] = currentLinkedVendorNames
    .filter(
      ([, , , linkedVendorNameType]) => !types.includes(linkedVendorNameType)
    )
    .concat(linkedVendorNames);

  return {updatedVendorContacts, updatedLinkedVendorNames};
}

export function _updateEntireData(
  sheet: Sheet,
  data: unknown[][],
  config?: Config
) {
  if (config.clearContentFirst) sheet.getDataRange().clearContent();

  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
}
