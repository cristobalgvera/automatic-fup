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
  _getRepairsInitialData,
  _getVendorsNames,
  _getToContactVendors,
  _utilitiesToExtractFupData,
  _getUtilitiesToEvaluateEmails,
} from '../util/service/read.utility';

type Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;

function extractRepairDataByVendorName(
  automatic = false,
  filters: string[] = REPAIR_DATA.UTIL.FILTERS.HITO_RADAR
) {
  const {
    expectedSheet,
    utils: {filterColumnNumber, sortColumnNumber, headerNumber: headers},
  } = _getRepairsInitialData();
  const {groupedVendors, vendorsContact} = _getVendorsNames();

  // Filter vendors checked as 'to send email', get his
  // contact data and set useful format to work with them
  const toContactVendors = _getToContactVendors(vendorsContact);
  const toFilterVendors = Object.values(toContactVendors).map(vendor => vendor);

  // Create a list-like string to show in a pop-up
  const toFilterVendorNames = toFilterVendors.reduce(
    (acc: string[], {id, name}) =>
      groupedVendors[id]
        ? validateEmail(toContactVendors[id].email)
          ? acc.concat(name)
          : acc.concat(addSuffix(name, UI.MODAL.SUFFIX.NO_EMAIL))
        : acc.concat(addSuffix(name, UI.MODAL.SUFFIX.NO_LINKED_VENDOR_NAMES)),
    []
  );

  // Confirm vendors to filter with user
  if (!automatic)
    if (!userConfirmation(UI.MODAL.TO_SEARCH_VENDORS, toFilterVendorNames))
      return {};

  const {
    filters: {byHitoRadar, bySendEmail, byValidEmail},
    reducers: {onVendorId},
  } = _utilitiesToExtractFupData(
    toFilterVendors,
    groupedVendors,
    filterColumnNumber,
    sortColumnNumber,
    filters,
    headers,
    false
  );

  // Filter all vendors to get just the ones that are needed
  const vendors: GroupedVendors = expectedSheet
    .getDataRange()
    .getValues()
    .filter(byHitoRadar)
    .filter(byValidEmail)
    .filter(bySendEmail)
    .reduce(onVendorId, {});

  // Put in an array all vendors that has no data
  const withProblemsVendorNames = toFilterVendors.reduce(
    (acc: string[], {id, name}) =>
      vendors[id]
        ? acc
        : validateEmail(toContactVendors[id].email)
        ? acc.concat(addSuffix(name, UI.MODAL.SUFFIX.NO_PURCHASE_ORDERS))
        : acc.concat(addSuffix(name, UI.MODAL.SUFFIX.NO_EMAIL)),
    []
  );

  // If some vendor has no data, ask user for confirmation, else continue
  if (!automatic && withProblemsVendorNames.length)
    if (!userConfirmation(UI.MODAL.NO_DATA_VENDORS, withProblemsVendorNames))
      return {};

  return {vendors, headers, vendorsContact: toFilterVendors};
}

function getColumnNumbers(
  templateSpreadsheet: Spreadsheet,
  headers: HeaderNumber,
  isPurchase = true
): ColumnNumbers {
  const sheet = templateSpreadsheet.getSheetByName(TEMPLATE.SHEET.PURCHASE);
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
  const templateHeaders = Object.entries(TEMPLATE.UTIL.COLUMN_NAMES);

  const {toPurchaseOrders} = _getUtilitiesToEvaluateEmails();

  const purchaseOrders = data.reduce(
    toPurchaseOrders(contacts, templateHeaders),
    []
  );

  purchaseOrderService.saveAll(purchaseOrders);
}

export {
  extractRepairDataByVendorName,
  getColumnNumbers,
  getVendorsContact,
  evaluateByEmailSpreadsheets,
};
