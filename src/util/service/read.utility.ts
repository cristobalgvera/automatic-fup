import {VendorContact} from '../interface/vendor-contact.interface';
import {VendorsContact} from '../interface/vendor-contact.interface';
import {DB, PURCHASE_DATA, REPAIR_DATA, TEMPLATE, UI} from '../../config';
import {GroupedVendors} from '../interface/grouped-vendors.interface';
import {HeaderNumber} from '../interface/header-number.interface';
import {PurchaseOrder} from '../schema/purchase-order.schema';
import {
  addSuffix,
  userConfirmation,
  validateEmail,
} from '../../service/utility.service';
import {getVendorsContact} from '../../service/read.service';
import {purchaseOrderService} from '../../service/db/purchase-order.service';
import {DATA_ORIGIN} from '../enum/data-origin.enum';
type Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;
type Sheet = GoogleAppsScript.Spreadsheet.Sheet;
type FilterColumns = {[x: string]: number};
type SortColumns = {[x: string]: number};

function _getToContactVendors(
  vendorsContact: VendorsContact,
  groupedVendors: GroupedVendors
) {
  const bySendEmailAutomatically = ([, {sendEmail, automaticallySendEmail}]: [
    string,
    VendorContact
  ]) => sendEmail && automaticallySendEmail;

  return Object.entries(vendorsContact)
    .filter(bySendEmailAutomatically)
    .slice(0, 50)
    .reduce((acc, vendorContact) => {
      const [vendorId, contact] = vendorContact;

      if (!groupedVendors[vendorId]) return acc;

      acc[vendorId] = contact;
      return acc;
    }, {} as VendorsContact);
}

function _getVendorsNamesByDataOrigin(dataOrigin: DATA_ORIGIN) {
  const db = SpreadsheetApp.openById(DB.ID);

  const groupedVendors = _getGroupedVendors(db, dataOrigin);
  const vendorsContact = getVendorsContact(db, dataOrigin);

  return {groupedVendors, vendorsContact};
}

function _getGroupedVendors(db: Spreadsheet, dataOrigin: DATA_ORIGIN) {
  const groupedVendorsData: string[][] = db
    .getSheetByName(DB.SHEET.LINKED_VENDOR_NAME)
    .getDataRange()
    .getValues();

  const headers = groupedVendorsData.splice(0, 1)[0];

  const vendorIdColumn = headers.indexOf(DB.COLUMN.VENDOR_ID);
  const vendorNameColumn = headers.indexOf(DB.COLUMN.VENDOR_NAME);
  const vendorTypeColumn = headers.indexOf(DB.COLUMN.VENDOR_TYPE);
  const vendorZoneColumn = headers.indexOf(DB.COLUMN.VENDOR_ZONE);
  const vendorCodeColumn = headers.indexOf(DB.COLUMN.VENDOR_CODE);

  return groupedVendorsData.reduce((acc: GroupedVendors, vendor) => {
    const vendorType = vendor[vendorTypeColumn];

    if (vendorType !== dataOrigin) return acc;

    const vendorId = vendor[vendorIdColumn];
    const vendorName = vendor[vendorNameColumn];
    const vendorCode = vendor[vendorCodeColumn];
    const vendorZone = vendor[vendorZoneColumn];

    acc[vendorId] ??= [];
    acc[vendorId].push([vendorName, vendorCode, vendorZone]);
    return acc;
  }, {});
}

type PurchaseFilters = typeof PURCHASE_DATA.UTIL.FILTERS;
type RepairFilters = typeof REPAIR_DATA.UTIL.FILTERS;

function _utilitiesToExtractFupData(
  toFilterVendors: VendorContact[],
  groupedVendors: GroupedVendors,
  filterColumnNumbers: FilterColumns,
  sortColumnNumber: SortColumns,
  filters: RepairFilters | PurchaseFilters,
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

  const _getNameAndCodeColumns = (): [number, number] => {
    const vendorNameColumn = isPurchase
      ? sortColumnNumber[PURCHASE_DATA.UTIL.SORT_COLUMNS.VENDOR_NAME]
      : sortColumnNumber[REPAIR_DATA.UTIL.SORT_COLUMNS.VENDOR_NAME];
    const vendorCodeColumn = isPurchase
      ? sortColumnNumber[PURCHASE_DATA.UTIL.SORT_COLUMNS.VENDOR_CODE]
      : sortColumnNumber[REPAIR_DATA.UTIL.SORT_COLUMNS.VENDOR_CODE];

    return [vendorNameColumn, vendorCodeColumn];
  };

  const shouldSendEmailToVendor = (
    searchedName: string,
    searchedCode: string
  ) =>
    !!toFilterVendors.find(
      vendor =>
        groupedVendors[vendor.id]?.find(([name, code]) => {
          const codeMatch =
            String(code).toLocaleLowerCase() ===
            searchedCode.toLocaleLowerCase();
          const nameMatch =
            String(name).toLocaleLowerCase() ===
            searchedName.toLocaleLowerCase();

          return codeMatch || nameMatch;
        }) ?? false
    );

  const shouldSendPurchaseOrderToVendor = (row: string[]) => {
    const purchaseOrder = isPurchase
      ? row[headers[PURCHASE_DATA.COLUMN.RO_NUMBER]]
      : row[headers[REPAIR_DATA.COLUMN.RO_NUMBER]];

    const line = row[headers[PURCHASE_DATA.COLUMN.LINE]];
    const id = `${purchaseOrder}${line ?? 1}`;

    return !purchaseOrderService.validateStatus(id);
  };

  const isValidEmail = (searchedName: string, searchedCode: string) => {
    const email = toFilterVendors.find(
      vendor =>
        !!groupedVendors[vendor.id]?.find(([name, code]) => {
          const codeMatch =
            String(code).toLocaleLowerCase() ===
            searchedCode.toLocaleLowerCase();
          const nameMatch =
            String(name).toLocaleLowerCase() ===
            searchedName.toLocaleLowerCase();

          return codeMatch || nameMatch;
        })
    )?.email;

    return email ? validateEmail(email) : false;
  };
  /*
    Check if names match, if match, check vendorZone variable
    to know when to used it, if has to, compare it with the
    actual zone of DB sheet stored value ['BRA' | 'SSC']
  */
  const getVendorId = (
    vendorName: string,
    vendorCode: string,
    vendorZone?: string
  ) => {
    const groupedVendor = toFilterGroupedVendors.find(
      vendor =>
        vendor[1]?.some(([name, code, zone]) => {
          const codeMatch =
            String(code).toLocaleLowerCase() === vendorCode.toLocaleLowerCase();
          const nameMatch =
            String(name).toLocaleLowerCase() === vendorName.toLocaleLowerCase();
          const zoneMatch =
            !vendorZone || zone === vendorZone.toLocaleUpperCase();

          return (codeMatch || nameMatch) && zoneMatch;
        }) ?? false
    );
    return groupedVendor ? groupedVendor[0] : null;
  };

  const byHitoRadar = (row: string[]) => {
    if ('HITO_RADAR' in filters)
      return filters.HITO_RADAR.includes(
        row[filterColumnNumbers[REPAIR_DATA.UTIL.FILTER_COLUMNS.HITO_RADAR]]
      );
  };

  const byValidZone = (row: string[]) => {
    if ('SYSTEM' in filters)
      return filters.SYSTEM.includes(
        row[
          filterColumnNumbers[REPAIR_DATA.UTIL.FILTER_COLUMNS.SYSTEM]
        ].toLocaleUpperCase()
      );
  };

  const byResponsible = (row: string[]) => {
    if ('RESPONSIBLE' in filters) {
      const value =
        row[filterColumnNumbers[REPAIR_DATA.UTIL.FILTER_COLUMNS.RESPONSIBLE]];
      return value ? filters.RESPONSIBLE.includes(value) : true;
    }
  };

  const byAck = (row: string[]) => {
    if ('ACK' in filters)
      return filters.ACK.includes(
        row[filterColumnNumbers[PURCHASE_DATA.UTIL.FILTER_COLUMNS.ACK]]
      );
  };

  const byFupStatusActual = (row: string[]) => {
    if ('FUP_STATUS_ACTUAL' in filters) {
      return filters.FUP_STATUS_ACTUAL.includes(
        row[
          filterColumnNumbers[
            PURCHASE_DATA.UTIL.FILTER_COLUMNS.FUP_STATUS_ACTUAL
          ]
        ]
      );
    }
  };

  const byValidEmail = (row: string[]) => {
    const [vendorNameColumn, vendorCodeColumn] = _getNameAndCodeColumns();

    return toFilterVendors.length
      ? isValidEmail(row[vendorNameColumn], row[vendorCodeColumn])
      : false;
  };

  const bySendEmail = (row: string[]) => {
    const [vendorNameColumn, vendorCodeColumn] = _getNameAndCodeColumns();

    return toFilterVendors.length
      ? shouldSendEmailToVendor(row[vendorNameColumn], row[vendorCodeColumn])
      : false;
  };

  const onVendorId = (acc: GroupedVendors, row: string[]) => {
    const [vendorNameColumn, vendorCodeColumn] = _getNameAndCodeColumns();
    const vendorZoneColumn =
      filterColumnNumbers[REPAIR_DATA.UTIL.FILTER_COLUMNS.SYSTEM];

    const vendorName = row[vendorNameColumn];
    const vendorCode = row[vendorCodeColumn];
    const vendorZone = row[vendorZoneColumn]; // Can be undefined

    const vendorId = getVendorId(vendorName, vendorCode, vendorZone);

    if (!vendorId) return acc;

    if (!acc[vendorId])
      console.log(
        `Retrieving '${vendorName} (${vendorId} - ${vendorCode})' info from FUP data`
      );

    acc[vendorId] ??= [];

    if (shouldSendPurchaseOrderToVendor(row)) acc[vendorId].push(row);

    return acc;
  };

  const onHasDataVendors = (rawVendors: GroupedVendors) => (
    acc: GroupedVendors,
    name: string
  ) => {
    const dataAmount = rawVendors[name].length;
    if (!dataAmount) console.log(`Deleting '${name}' entry, has no data`);
    return dataAmount ? {...acc, [name]: rawVendors[name]} : acc;
  };

  return {
    filters: {
      byHitoRadar,
      byAck,
      byFupStatusActual,
      byValidZone,
      bySendEmail,
      byValidEmail,
      byResponsible,
    },
    reducers: {
      onVendorId,
      onHasDataVendors,
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
      vendorName: vendorName ?? 'NOT_FOUND',
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
        isPurchase: !!row[headerNumbers.line],
        updatedInSheet: false,
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
    purchaseContacts: [string, VendorContact][],
    repairContacts: [string, VendorContact][],
    vendorEmail: string
  ) => (spreadsheet: Spreadsheet) => {
    const isPurchase = _isPurchaseSpreadsheet(spreadsheet);

    let contact: [string, VendorContact] | [];

    if (isPurchase)
      contact =
        purchaseContacts.find(([, {email}]) => email === vendorEmail) ?? [];
    else
      contact =
        repairContacts.find(([, {email}]) => email === vendorEmail) ?? [];

    const vendorName = contact[1]?.name;

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
    purchaseContacts: [string, VendorContact][],
    repairContacts: [string, VendorContact][],
    templateHeaders: string[][]
  ) => (
    acc: PurchaseOrder[],
    [vendorEmail, spreadsheets]: [string, Spreadsheet[]]
  ) => {
    const toPurchaseOrdersArray = purchaseOrdersMapperGenerator(
      templateHeaders,
      purchaseContacts,
      repairContacts,
      vendorEmail
    );

    const purchasesOrders = spreadsheets.map(toPurchaseOrdersArray).flat();

    return acc.concat(purchasesOrders);
  };

  return {toPurchaseOrders};
}

function _getFupInitialData(dataOrigin: DATA_ORIGIN) {
  let spreadsheet: Spreadsheet, expectedSheet: Sheet;

  switch (dataOrigin) {
    case DATA_ORIGIN.REPAIR:
      spreadsheet = SpreadsheetApp.openById(REPAIR_DATA.ID);
      expectedSheet = spreadsheet.getSheetByName(REPAIR_DATA.SHEET.ACTUAL);
      break;
    case DATA_ORIGIN.PURCHASE:
      spreadsheet = SpreadsheetApp.openById(PURCHASE_DATA.ID);
      expectedSheet = spreadsheet.getSheetByName(PURCHASE_DATA.SHEET.ACTUAL);
      break;
  }

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

  const filterColumnNumbers: FilterColumns = {};
  const sortColumnNumber: SortColumns = {};

  switch (dataOrigin) {
    case DATA_ORIGIN.REPAIR:
      filterColumnNumbers[REPAIR_DATA.UTIL.FILTER_COLUMNS.HITO_RADAR] ??=
        headerNumber[REPAIR_DATA.UTIL.FILTER_COLUMNS.HITO_RADAR];
      filterColumnNumbers[REPAIR_DATA.UTIL.FILTER_COLUMNS.SYSTEM] ??=
        headerNumber[REPAIR_DATA.UTIL.FILTER_COLUMNS.SYSTEM];

      sortColumnNumber[REPAIR_DATA.UTIL.SORT_COLUMNS.VENDOR_NAME] =
        headerNumber[REPAIR_DATA.UTIL.SORT_COLUMNS.VENDOR_NAME];
      sortColumnNumber[REPAIR_DATA.UTIL.SORT_COLUMNS.VENDOR_CODE] =
        headerNumber[REPAIR_DATA.UTIL.SORT_COLUMNS.VENDOR_CODE];
      break;
    case DATA_ORIGIN.PURCHASE:
      filterColumnNumbers[
        PURCHASE_DATA.UTIL.FILTER_COLUMNS.FUP_STATUS_ACTUAL
      ] ??= headerNumber[PURCHASE_DATA.UTIL.FILTER_COLUMNS.FUP_STATUS_ACTUAL];
      filterColumnNumbers[PURCHASE_DATA.UTIL.FILTER_COLUMNS.ACK] ??=
        headerNumber[PURCHASE_DATA.UTIL.FILTER_COLUMNS.ACK];

      sortColumnNumber[PURCHASE_DATA.UTIL.SORT_COLUMNS.VENDOR_NAME] =
        headerNumber[PURCHASE_DATA.UTIL.SORT_COLUMNS.VENDOR_NAME];
      sortColumnNumber[PURCHASE_DATA.UTIL.SORT_COLUMNS.VENDOR_CODE] =
        headerNumber[PURCHASE_DATA.UTIL.SORT_COLUMNS.VENDOR_CODE];
      break;
  }

  return {
    expectedSheet,
    utils: {
      filterColumnNumbers,
      sortColumnNumber,
      headerNumber,
    },
  };
}

function _alertVendorsToFilter(
  groupedVendors: GroupedVendors,
  toContactVendors: VendorsContact,
  toFilterVendors: VendorContact[]
) {
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
  return !userConfirmation(UI.MODAL.TO_SEARCH_VENDORS, toFilterVendorNames);
}

function _alertVendorWithProblems(
  vendors: GroupedVendors,
  toContactVendors: VendorsContact,
  toFilterVendors: VendorContact[]
) {
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
  if (withProblemsVendorNames.length)
    return !userConfirmation(UI.MODAL.NO_DATA_VENDORS, withProblemsVendorNames);

  return false;
}

function _isPurchaseSpreadsheet(spreadsheet: Spreadsheet) {
  return spreadsheet
    .getSheets()
    .some(sheet =>
      sheet
        .getRange(2, 1, 1, sheet.getLastColumn())
        .getValues()[0]
        .includes(TEMPLATE.COLUMN.LINE)
    );
}

export {
  _getFupInitialData,
  _getVendorsNamesByDataOrigin,
  _getToContactVendors,
  _utilitiesToExtractFupData,
  _getUtilitiesToEvaluateEmails,
  _alertVendorsToFilter,
  _alertVendorWithProblems,
  _isPurchaseSpreadsheet,
};
