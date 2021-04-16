import {REPAIR_DATA, DB, TEMPLATE, UI, PURCHASE_DATA} from '../config';
import {HeaderNumber} from '../util/interface/header-number.interface';
import {
  VendorContact,
  VendorsContact,
} from '../util/interface/vendor-contact.interface';
import {GroupedVendors} from '../util/interface/grouped-vendors.interface';
import {ColumnNumbers} from '../util/interface/column-numbers.interface';
import {
  addSuffix,
  toCamelCase,
  userConfirmation,
  validateEmail,
} from './utility.service';
import {ByEmailSpreadsheets} from '../util/interface/by-email-spreadsheets.interface';
import {purchaseOrderService} from './purchase-order.service';
import {
  _getFupInitialData,
  _getVendorsNames,
  _getToContactVendors,
  _utilitiesToExtractFupData,
  _getUtilitiesToEvaluateEmails,
  _alertVendorsToFilter,
  _alertVendorWithProblems,
} from '../util/service/read.utility';

type Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;

function extractRepairDataByVendorName(
  automatic?: boolean,
  filters: string[] = REPAIR_DATA.UTIL.FILTERS.HITO_RADAR
) {
  const {
    expectedSheet,
    utils: {filterColumnNumbers, sortColumnNumber, headerNumber: headers},
  } = _getFupInitialData('REPAIR');
  const {groupedVendors, vendorsContact} = _getVendorsNames();

  // Filter vendors checked as 'to send email', get his
  // contact data and set useful format to work with them
  const toContactVendors = _getToContactVendors(vendorsContact);
  const toFilterVendors = Object.values(toContactVendors);

  if (
    !automatic &&
    _alertVendorsToFilter(groupedVendors, toContactVendors, toFilterVendors)
  )
    return {};

  const {
    filters: {byHitoRadar, bySendEmail, byValidEmail},
    reducers: {onVendorId, onHasDataVendors},
  } = _utilitiesToExtractFupData(
    toFilterVendors,
    groupedVendors,
    filterColumnNumbers,
    sortColumnNumber,
    filters,
    headers,
    false
  );

  // Filter all vendors to get just the ones that are needed
  const rawVendors: GroupedVendors = expectedSheet
    .getDataRange()
    .getValues()
    .filter(byHitoRadar)
    .filter(byValidEmail)
    .filter(bySendEmail)
    .reduce(onVendorId, {});

  const vendors: GroupedVendors = Object.keys(rawVendors).reduce(
    onHasDataVendors(rawVendors),
    {}
  );

  console.log(`TOTAL: ${Object.keys(vendors).length} vendors`);

  if (
    !automatic &&
    _alertVendorWithProblems(vendors, toContactVendors, toFilterVendors)
  )
    return {};

  return {vendors, headers, vendorsContact: toFilterVendors};
}

function extractPurchaseDataByVendorName(
  automatic?: boolean,
  filters = PURCHASE_DATA.UTIL.FILTERS
) {
  const {
    expectedSheet,
    utils: {filterColumnNumbers, sortColumnNumber, headerNumber: headers},
  } = _getFupInitialData('PURCHASE');
  const {groupedVendors, vendorsContact} = _getVendorsNames();

  const toContactVendors = _getToContactVendors(vendorsContact);
  const toFilterVendors = Object.values(toContactVendors);

  if (
    !automatic &&
    _alertVendorsToFilter(groupedVendors, toContactVendors, toFilterVendors)
  )
    return {};

  const {
    filters: {byAck, byFupStatusActual, bySendEmail, byValidEmail},
    reducers: {onVendorId, onHasDataVendors},
  } = _utilitiesToExtractFupData(
    toFilterVendors,
    groupedVendors,
    filterColumnNumbers,
    sortColumnNumber,
    filters,
    headers,
    false
  );

  const rawVendors: GroupedVendors = expectedSheet
    .getDataRange()
    .getValues()
    .filter(byAck)
    .filter(byFupStatusActual)
    .filter(byValidEmail)
    .filter(bySendEmail)
    .reduce(onVendorId, {});

  const vendors: GroupedVendors = Object.keys(rawVendors).reduce(
    onHasDataVendors(rawVendors),
    {}
  );

  console.log(`TOTAL: ${Object.keys(vendors).length} vendors`);

  if (
    !automatic &&
    _alertVendorWithProblems(vendors, toContactVendors, toFilterVendors)
  )
    return {};

  return {vendors, headers, vendorsContact: toFilterVendors};
}

function getColumnNumbers(
  templateSpreadsheet: Spreadsheet,
  headers: HeaderNumber,
  isPurchase = true
): ColumnNumbers {
  const sheet = templateSpreadsheet.getSheetByName(TEMPLATE.SHEET.OPEN_ORDERS);
  const templateHeaders = sheet
    .getRange(2, 1, 1, sheet.getLastColumn())
    .getValues()[0];

  return {
    templatePurchaseOrderColumn:
      templateHeaders.indexOf(TEMPLATE.COLUMN.PURCHASE_ORDER) + 1,
    templatePartNumberColumn:
      templateHeaders.indexOf(TEMPLATE.COLUMN.PART_NUMBER) + 1,
    templateLineColumn: templateHeaders.indexOf(TEMPLATE.COLUMN.LINE) + 1,
    roNumberColumn: isPurchase
      ? headers[PURCHASE_DATA.COLUMN.RO_NUMBER]
      : headers[REPAIR_DATA.COLUMN.RO_NUMBER],
    partNumberColumn: isPurchase
      ? headers[PURCHASE_DATA.COLUMN.PART_NUMBER]
      : headers[REPAIR_DATA.COLUMN.PART_NUMBER],
    lineColumn: isPurchase
      ? headers[PURCHASE_DATA.COLUMN.LINE]
      : headers[REPAIR_DATA.COLUMN.LINE],
  };
}

function getVendorsContact(db: Spreadsheet): VendorsContact {
  const vendorsDataDataRange: string[][] = db
    .getSheetByName(DB.SHEET.VENDOR)
    .getDataRange()
    .getValues();
  const headers = vendorsDataDataRange.splice(0, 1)[0].map(toCamelCase);
  const idColumn = headers.indexOf(toCamelCase(DB.COLUMN.ID));

  return vendorsDataDataRange.reduce((acc, vendor) => {
    const vendorId = vendor[idColumn];
    if (!acc[vendorId]) {
      acc[vendorId] = headers.reduce((obj, header, index) => {
        obj[header] = vendor[index];
        return obj;
      }, {} as VendorContact);
    }

    return acc;
  }, {} as VendorsContact);
}

function evaluateByEmailSpreadsheets(byEmailSpreadsheets: ByEmailSpreadsheets) {
  const db = SpreadsheetApp.openById(DB.ID);
  const data = Object.entries(byEmailSpreadsheets);
  const vendorsContact = getVendorsContact(db);
  const contacts = Object.entries(vendorsContact);
  const templateHeaders = Object.entries(TEMPLATE.UTIL.COLUMN_NAME);

  const {toPurchaseOrders} = _getUtilitiesToEvaluateEmails();

  const purchaseOrders = data.reduce(
    toPurchaseOrders(contacts, templateHeaders),
    []
  );

  purchaseOrderService.saveAll(purchaseOrders);
}

export {
  extractRepairDataByVendorName,
  extractPurchaseDataByVendorName,
  getColumnNumbers,
  getVendorsContact,
  evaluateByEmailSpreadsheets,
};
