import {VendorContact} from '../interface/vendor-contact.interface';
import {VendorsContact} from '../interface/vendor-contact.interface';
import {DB, PURCHASE_DATA, REPAIR_DATA, TEMPLATE} from '../../config';
import {GroupedVendors} from '../interface/grouped-vendors.interface';
import {HeaderNumber} from '../interface/header-number.interface';
import {PurchaseOrder} from '../schema/purchase-order.schema';
import {validateEmail} from '../../service/utility.service';
import {getVendorsContact} from '../../service/read.service';
import {purchaseOrderService} from '../../service/purchase-order.service';
type Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;

function _getToContactVendors(vendorsContact: VendorsContact) {
  return Object.entries(vendorsContact).reduce((acc, vendorContact) => {
    const [vendorId, contact] = vendorContact;
    if (contact.sendEmail) acc[vendorId] = contact;

    return acc;
  }, {} as VendorsContact);
}

function _getVendorsNames() {
  const db = SpreadsheetApp.openById(DB.ID);

  const groupedVendors = _getGroupedVendors(db);
  const vendorsContact = getVendorsContact(db);

  return {groupedVendors, vendorsContact};
}

function _getGroupedVendors(db: Spreadsheet) {
  const groupedVendorsDataRange: string[][] = db
    .getSheetByName(DB.SHEET.LINKED_VENDOR_NAME)
    .getDataRange()
    .getValues();
  const headers = groupedVendorsDataRange.splice(0, 1)[0];

  const vendorIdColumn = headers.indexOf(DB.COLUMN.VENDOR_ID);
  const vendorNameColumn = headers.indexOf(DB.COLUMN.VENDOR_NAME);

  return groupedVendorsDataRange.reduce((acc: GroupedVendors, vendor) => {
    const vendorId = vendor[vendorIdColumn];
    const vendorName = vendor[vendorNameColumn];

    acc[vendorId] ??= [];
    acc[vendorId].push(vendorName);
    return acc;
  }, {});
}

function _utilitiesToExtractFupData(
  toFilterVendors: VendorContact[],
  groupedVendors: GroupedVendors,
  filterColumnNumber: number,
  sortColumnNumber: number,
  filters: string[],
  headers: HeaderNumber,
  isPurchase = true
) {
  const toFilterGroupedVendors = Object.entries(
    toFilterVendors.reduce(
      (acc: GroupedVendors, {id}) => ({
        ...acc,
        [id]: groupedVendors[id],
      }),
      {}
    )
  );

  const shouldSendEmailToVendor = (searchedName: string) =>
    !!toFilterVendors.find(
      vendor =>
        groupedVendors[vendor.id]?.find(name => name === searchedName) ?? false
    );

  const shouldSendPurchaseOrderToVendor = (row: string[]) => {
    const purchaseOrder = isPurchase
      ? row[headers[PURCHASE_DATA.COLUMN.RO_NUMBER]]
      : row[headers[REPAIR_DATA.COLUMN.RO_NUMBER]];

    const line = row[headers[PURCHASE_DATA.COLUMN.LINE]];
    const id = `${purchaseOrder}-${line ?? 1}`;

    return !purchaseOrderService.validateStatus(id);
  };

  const isValidEmail = (searchedName: string) => {
    const email = toFilterVendors.find(
      vendor => !!groupedVendors[vendor.id]?.find(name => name === searchedName)
    )?.email;

    return email ? validateEmail(email) : false;
  };

  const getVendorId = (vendorName: string) =>
    toFilterGroupedVendors.find(
      vendor => vendor[1]?.some(name => name === vendorName) ?? false
    )[0];

  const byHitoRadar = (row: string[]) =>
    filters.includes(row[filterColumnNumber]);

  const byValidEmail = (row: string[]) =>
    toFilterVendors.length ? isValidEmail(row[sortColumnNumber]) : false;

  const bySendEmail = (row: string[]) =>
    toFilterVendors.length
      ? shouldSendEmailToVendor(row[sortColumnNumber])
      : false;

  const onVendorId = (acc, row: string[]) => {
    const vendorId = getVendorId(row[sortColumnNumber]);

    acc[vendorId] ??= [];

    if (shouldSendPurchaseOrderToVendor(row)) acc[vendorId].push(row);

    return acc;
  };

  return {
    filters: {
      byHitoRadar,
      bySendEmail,
      byValidEmail,
    },
    reducers: {
      onVendorId,
    },
  };
}

function _getUtilitiesToEvaluateEmails() {
  const purchaseOrdersGenerator = (
    vendorName: string,
    vendorEmail: string,
    headerNumbers: Partial<typeof TEMPLATE.UTIL.COLUMN_NAME>
  ) => (curr: PurchaseOrder[], row: string[]) =>
    curr.concat({
      vendorName: vendorName || null,
      purchaseOrder: row[headerNumbers.purchaseOrder] || null,
      line: row[headerNumbers.line] || null,
      partNumber: row[headerNumbers.partNumber] || null,
      status: row[headerNumbers.status] || null,
      esd: row[headerNumbers.esd] || null,
      shippedDate: row[headerNumbers.shippedDate] || null,
      qtyShipped: row[headerNumbers.qtyShipped] || null,
      awb: row[headerNumbers.awb] || null,
      comments: row[headerNumbers.comments] || null,
      audit: {
        vendorEmail: vendorEmail || null,
      },
    });

  const spreadsheetValuesAndHeaderNumbersGenerator = (
    spreadsheet: Spreadsheet,
    templateHeaders: string[][]
  ) => {
    // This should never fail if previous method validation was right
    const sheet = spreadsheet
      .getSheets()
      .find(inSheet =>
        inSheet
          .getRange(2, 1, 1, inSheet.getLastColumn())
          .getValues()[0]
          .includes(TEMPLATE.COLUMN.PURCHASE_ORDER)
      );

    let headers: string[] = sheet
      .getRange(2, 1, 1, sheet.getLastColumn())
      .getValues()[0];

    // Find PO column number if sheet columns was modified
    const poNumberColumnNumber =
      headers.indexOf(TEMPLATE.COLUMN.PURCHASE_ORDER) + 1;

    headers = headers.slice(poNumberColumnNumber - 1, poNumberColumnNumber + 9);

    // Minus header rows
    const numberOfRows = sheet.getLastRow() - 2;

    const headerNumbers = headers.reduce((acc, header, i) => {
      const templateHeader = templateHeaders.find(
        ([, name]) => name === header
      );
      return templateHeader ? {...acc, [templateHeader[0]]: i} : acc;
    }, {} as Partial<typeof TEMPLATE.UTIL.COLUMN_NAME>);

    const spreadsheetValues: string[][] = sheet
      .getRange(3, poNumberColumnNumber, numberOfRows, 9)
      .getValues();

    return {spreadsheetValues, headerNumbers};
  };

  const purchaseOrdersMapperGenerator = (
    templateHeaders: string[][],
    vendorName: string,
    vendorEmail: string
  ) => (spreadsheet: Spreadsheet) => {
    const {
      spreadsheetValues,
      headerNumbers,
    } = spreadsheetValuesAndHeaderNumbersGenerator(
      spreadsheet,
      templateHeaders
    );

    const onPurchaseOrders = purchaseOrdersGenerator(
      vendorName,
      vendorEmail,
      headerNumbers
    );

    return spreadsheetValues.reduce(onPurchaseOrders, []);
  };

  const toPurchaseOrders = (
    contacts: [string, VendorContact][],
    templateHeaders: string[][]
  ) => (acc: PurchaseOrder[], [vendorEmail, spreadsheets]) => {
    const contact = contacts.find(([, {email}]) => email === vendorEmail) ?? [];
    const vendorName = contact[1]?.name;

    const toPurchaseOrdersArray = purchaseOrdersMapperGenerator(
      templateHeaders,
      vendorName,
      vendorEmail
    );

    const purchaseOrdersArray: PurchaseOrder[][] = spreadsheets.map(
      toPurchaseOrdersArray
    );

    const purchasesOrders = purchaseOrdersArray.reduce(
      (acc, purchases) => acc.concat(purchases.map(purchase => purchase)),
      []
    );

    return acc.concat(purchasesOrders);
  };

  return {toPurchaseOrders};
}

function _getRepairsInitialData() {
  const spreadsheet = SpreadsheetApp.openById(REPAIR_DATA.ID);
  const expectedSheet = spreadsheet.getSheetByName(REPAIR_DATA.SHEET.ACTUAL);

  const totalColumns = expectedSheet.getLastColumn();

  const headers: string[] = expectedSheet
    .getRange(1, 1, 1, totalColumns)
    .getValues()[0];
  const headerNumber: HeaderNumber = headers.reduce(
    (acc, header, index) => ({
      ...acc,
      [header]: index,
    }),
    {}
  );

  const filterColumnNumber =
    headerNumber[REPAIR_DATA.UTIL.FILTER_COLUMNS.HITO_RADAR];
  const sortColumnNumber =
    headerNumber[REPAIR_DATA.UTIL.SORT_COLUMNS.VENDOR_NAME];

  return {
    expectedSheet,
    utils: {filterColumnNumber, sortColumnNumber, headerNumber},
  };
}

export {
  _getRepairsInitialData,
  _getVendorsNames,
  _getToContactVendors,
  _utilitiesToExtractFupData,
  _getUtilitiesToEvaluateEmails,
};
