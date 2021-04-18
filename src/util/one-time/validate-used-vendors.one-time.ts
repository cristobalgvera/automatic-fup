import {DB, PURCHASE_DATA} from '../../config';

export function validateUsedVendors() {
  const dbSpreadsheet = SpreadsheetApp.openById(DB.ID);
  const linkedVendorNameSheet = dbSpreadsheet.getSheetByName(
    DB.SHEET.LINKED_VENDOR_NAME
  );

  const dbVendorNames: string[] = linkedVendorNameSheet
    .getRange(2, 2, linkedVendorNameSheet.getLastRow())
    .getValues()
    .flat();

  const purchasesSpreadsheet = SpreadsheetApp.openById(PURCHASE_DATA.ID);
  const purchasesActualSheet = purchasesSpreadsheet.getSheetByName(
    PURCHASE_DATA.SHEET.ACTUAL
  );

  const purchasesData = purchasesActualSheet.getDataRange().getValues();
  const headers = purchasesData.splice(0, 1)[0];

  const vendorNameCol = headers.indexOf(PURCHASE_DATA.COLUMN.VENDOR_NAME);
  const ackCol = headers.indexOf(PURCHASE_DATA.UTIL.FILTER_COLUMNS.ACK);
  const fupStatusActualCol = headers.indexOf(
    PURCHASE_DATA.UTIL.FILTER_COLUMNS.FUP_STATUS_ACTUAL
  );

  const purchasesVendorNames: string[] = purchasesData
    .filter(data => PURCHASE_DATA.UTIL.FILTERS.ACK.includes(data[ackCol]))
    .filter(data =>
      PURCHASE_DATA.UTIL.FILTERS.FUP_STATUS_ACTUAL.includes(
        data[fupStatusActualCol]
      )
    )
    .map(data => data[vendorNameCol]);

  const unusedVendorNames = purchasesVendorNames.filter(
    name => !dbVendorNames.includes(name)
  );

  const uniqueUnusedNames = Array.from(new Set(unusedVendorNames), name => [
    name,
  ]);

  const spreadsheet = SpreadsheetApp.openById(
    '1iWRK1BV2on5bGOmejjmKHqfCsQ7DDEeTE1AXBTRLg3E'
  );
  const sheet = spreadsheet.getSheetByName('OTROS');

  sheet.getRange(2, 1, uniqueUnusedNames.length).setValues(uniqueUnusedNames);
}
