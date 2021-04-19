import {DB, PURCHASE_DATA, REPAIR_DATA} from '../../config';

export function validateUsedVendors() {
  const dbSpreadsheet = SpreadsheetApp.openById(DB.ID);
  const linkedVendorNameSheet = dbSpreadsheet.getSheetByName(
    DB.SHEET.LINKED_VENDOR_NAME
  );

  const dbVendorNames: string[] = linkedVendorNameSheet
    .getRange(427, 2, linkedVendorNameSheet.getLastRow())
    .getValues()
    .flat()
    .map(v => v.toLocaleLowerCase());

  const purchasesSpreadsheet = SpreadsheetApp.openById(REPAIR_DATA.ID);
  const purchasesActualSheet = purchasesSpreadsheet.getSheetByName(
    REPAIR_DATA.SHEET.ACTUAL
  );

  const purchasesData = purchasesActualSheet.getDataRange().getValues();
  const headers = purchasesData.splice(0, 1)[0];

  const hitoRadarCol = headers.indexOf(
    REPAIR_DATA.UTIL.FILTER_COLUMNS.HITO_RADAR
  );
  const vendorNameCol = headers.indexOf(REPAIR_DATA.COLUMN.VENDOR_NAME);

  const purchasesVendorNames: string[] = purchasesData
    .filter(data =>
      REPAIR_DATA.UTIL.FILTERS.HITO_RADAR.includes(data[hitoRadarCol])
    )
    .map(data => data[vendorNameCol]);

  const unusedVendorNames = purchasesVendorNames.filter(
    name => !dbVendorNames.includes(name.toLocaleLowerCase())
  );

  const uniqueUnusedNames = Array.from(new Set(unusedVendorNames), name => [
    name,
  ]);

  const spreadsheet = SpreadsheetApp.openById(
    '1iWRK1BV2on5bGOmejjmKHqfCsQ7DDEeTE1AXBTRLg3E'
  );
  const sheet = spreadsheet.getSheetByName('OTROS');

  sheet.getRange(2, 3, uniqueUnusedNames.length).setValues(uniqueUnusedNames);
}
