import {DB} from '../../config';
import {changeVendorId} from './change-vendor-id.one-time';
import {
  exportPurchaseVendorData,
  updatePurchaseVendors,
} from './export-purchase-vendor-data.one-time';
import {
  exportRepairVendorData,
  updateRepairVendors,
} from './export-repair-vendor-data.one-time';

export type IdStringArray = {[id: string]: string[]};
export type IdStringBooleanArray = {[id: string]: (string | boolean)[]};

export function filterPurchaseVendorData() {
  exportPurchaseVendorData();
  changeVendorId('C - ', 'COMPRAS');
}

export function filterRepairVendorData() {
  exportRepairVendorData();
  changeVendorId('R - ', 'REPARACIONES SSC');
  changeVendorId('R - ', 'REPARACIONES BRA');
}

export function updateVendorData() {
  const {
    vendorContacts: repairVendorContacts,
    linkedVendorNames: repairLinkedVendorNames,
  } = updateRepairVendors();
  const {
    vendorContacts: purchaseVendorContacts,
    linkedVendorNames: purchaseLinkedVendorNames,
  } = updatePurchaseVendors();

  const {updatedVendorContacts, updatedLinkedVendorNames} = _persistVendorData({
    vendorContacts: {...repairVendorContacts, ...purchaseVendorContacts},
    linkedVendorNames: [
      ...repairLinkedVendorNames,
      ...purchaseLinkedVendorNames,
    ],
  });

  console.log({updatedVendorContacts, updatedLinkedVendorNames});
}

function _persistVendorData({
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
