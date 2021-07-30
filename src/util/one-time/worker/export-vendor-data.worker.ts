import {DB} from '../../../config';
import {
  gettingVendorsData,
  mergingVendorsData,
} from '../../../service/message.service';
import {updatePurchaseVendors} from '../export-purchase-vendor-data.one-time';
import {updateRepairVendors} from '../export-repair-vendor-data.one-time';
import {
  _updateEntireData,
  _persistVendorData,
} from '../helper/export-vendor-data.helper';

export type IdStringArray = {[id: string]: string[]};
export type IdStringBooleanArray = {[id: string]: (string | boolean)[]};

export function updateVendorData() {
  console.log(gettingVendorsData());
  const {
    vendorContacts: repairVendorContacts,
    linkedVendorNames: repairLinkedVendorNames,
  } = updateRepairVendors();

  console.log(gettingVendorsData(true));
  const {
    vendorContacts: purchaseVendorContacts,
    linkedVendorNames: purchaseLinkedVendorNames,
  } = updatePurchaseVendors();

  console.log(mergingVendorsData());
  const {updatedVendorContacts, updatedLinkedVendorNames} = _persistVendorData({
    vendorContacts: {...repairVendorContacts, ...purchaseVendorContacts},
    linkedVendorNames: [
      ...repairLinkedVendorNames,
      ...purchaseLinkedVendorNames,
    ],
  });

  const spreadsheet = SpreadsheetApp.openById(DB.ID);
  const updateVendorSheet = spreadsheet.getSheetByName(DB.SHEET.VENDOR_UPDATE);
  const updateLinkedVendorNamesSheet = spreadsheet.getSheetByName(
    DB.SHEET.LINKED_VENDOR_NAME_UPDATE
  );

  _updateEntireData(updateVendorSheet, updatedVendorContacts, {
    clearContentFirst: true,
  });

  _updateEntireData(updateLinkedVendorNamesSheet, updatedLinkedVendorNames, {
    clearContentFirst: true,
  });
}

export function replaceVendorData() {
  const ui = SpreadsheetApp.getUi();

  const userSelectedButton = ui.alert(
    'Reemplazo de información actual',
    'Esta acción no puede deshacerse, ¿estás seguro/a que quieres reemplazar la información?',
    ui.ButtonSet.YES_NO
  );

  if (userSelectedButton !== ui.Button.YES) return;

  const spreadsheet = SpreadsheetApp.openById(DB.ID);
  const updateVendorSheet = spreadsheet.getSheetByName(DB.SHEET.VENDOR_UPDATE);
  const updateLinkedVendorNamesSheet = spreadsheet.getSheetByName(
    DB.SHEET.LINKED_VENDOR_NAME_UPDATE
  );
  const vendorSheet = spreadsheet.getSheetByName(DB.SHEET.VENDOR);
  const linkedVendorNamesSheet = spreadsheet.getSheetByName(
    DB.SHEET.LINKED_VENDOR_NAME
  );

  const updatedVendors = updateVendorSheet.getDataRange().getValues();
  const updatedLinkedVendorNames = updateLinkedVendorNamesSheet
    .getDataRange()
    .getValues();

  _updateEntireData(vendorSheet, updatedVendors, {clearContentFirst: true});
  _updateEntireData(linkedVendorNamesSheet, updatedLinkedVendorNames, {
    clearContentFirst: true,
  });
}
