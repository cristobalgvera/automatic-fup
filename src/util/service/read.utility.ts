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
import {
  deletingNoDataEntry,
  retrievingInfoFrom,
} from '../../service/message.service';
import {NOT_FOUND} from '../enum/not-found.enum';
import {RESPONSIBLE} from '../enum/responsible.enum';
import {PO_STATUS} from '../enum/po-status.enum';
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

  const entries = Object.entries(vendorsContact).filter(
    bySendEmailAutomatically
  );

  const allEntries = entries.length;

  const vendorsToTake =
    allEntries <= DB.UTIL.MAX_VENDORS_TO_TAKE
      ? allEntries
      : DB.UTIL.VENDORS_TO_TAKE;

  const reducedVendorsContact: VendorsContact = {};
  let size = 0;

  // Sort of slice, but better performance
  for (const [vendorId, contact] of entries) {
    if (size >= vendorsToTake) break;
    if (!groupedVendors[vendorId]) continue;

    reducedVendorsContact[vendorId] = {...contact};
    size++;
  }

  if (!size) {
    const checkedVendorsContact = entries.map(([, contact]) => contact);
    return {reducedVendorsContact, checkedVendorsContact};
  }

  return {reducedVendorsContact};
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
  const {
    vendorNameSortColumnName,
    vendorCodeSortColumnName,
    roNumberHeaderName,
    responsibleFilterColumn,
    buyerManagementFilterColumn,
    poStatusFilterColumn,
  } = _getConditionalConstants(isPurchase);

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
    const vendorNameColumn = sortColumnNumber[vendorNameSortColumnName];
    const vendorCodeColumn = sortColumnNumber[vendorCodeSortColumnName];

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
            String(searchedCode).toLocaleLowerCase();
          const nameMatch =
            String(name).toLocaleLowerCase() ===
            String(searchedName).toLocaleLowerCase();

          return codeMatch || nameMatch;
        }) ?? false
    );

  const shouldSendPurchaseOrderToVendor = (row: string[]) => {
    const purchaseOrder = row[headers[roNumberHeaderName]];

    const line = row[headers[PURCHASE_DATA.COLUMN.LINE]];
    const id = `${purchaseOrder}${line ?? 1}`;

    return !purchaseOrderService.validateStatus(id);
  };

  const _purchaseOrderShouldBeManaged = (row: string[]) =>
    row[filterColumnNumbers[PURCHASE_DATA.UTIL.FILTER_COLUMNS.RESPONSIBLE]] ===
      RESPONSIBLE.PROCUREMENT &&
    row[filterColumnNumbers[PURCHASE_DATA.UTIL.FILTER_COLUMNS.PO_STATUS]] !==
      PO_STATUS.CANCELLED;

  const isValidEmail = (searchedName: string, searchedCode: string) => {
    const email = toFilterVendors.find(
      vendor =>
        !!groupedVendors[vendor.id]?.find(([name, code]) => {
          const codeMatch =
            String(code).toLocaleLowerCase() ===
            String(searchedCode).toLocaleLowerCase();
          const nameMatch =
            String(name).toLocaleLowerCase() ===
            String(searchedName).toLocaleLowerCase();

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
            String(code).toLocaleLowerCase() ===
            String(vendorCode).toLocaleLowerCase();
          const nameMatch =
            String(name).toLocaleLowerCase() ===
            String(vendorName).toLocaleLowerCase();
          const zoneMatch =
            !vendorZone || zone === vendorZone.toLocaleUpperCase();

          return (codeMatch || nameMatch) && zoneMatch;
        }) ?? false
    );
    return groupedVendor ? groupedVendor[0] : null;
  };

  const byStatus = (row: string[]) => {
    if ('STATUS' in filters)
      return filters.STATUS.includes(
        row[filterColumnNumbers[REPAIR_DATA.UTIL.FILTER_COLUMNS.STATUS]]
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
      const responsible = row[filterColumnNumbers[responsibleFilterColumn]];
      if (!responsible || filters.RESPONSIBLE.includes(responsible))
        return true;

      const buyerManagement = !!row[
        filterColumnNumbers[buyerManagementFilterColumn]
      ]; // Boolean field
      if (!buyerManagement) return false;

      const poStatus = row[filterColumnNumbers[poStatusFilterColumn]];
      return filters.PO_STATUS.includes(poStatus);
    }
  };

  const byAck = (row: string[]) => {
    if ('ACK' in filters)
      return filters.ACK.includes(
        row[filterColumnNumbers[PURCHASE_DATA.UTIL.FILTER_COLUMNS.ACK]]
      );
  };

  const byFupStatusActual = (row: string[]) => {
    if (_purchaseOrderShouldBeManaged(row))
      return !!row[
        filterColumnNumbers[PURCHASE_DATA.UTIL.FILTER_COLUMNS.BUYER_MANAGEMENT]
      ];

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
      console.log(retrievingInfoFrom(vendorName, vendorId, vendorCode));

    acc[vendorId] ??= [];

    if (shouldSendPurchaseOrderToVendor(row)) acc[vendorId].push(row);

    return acc;
  };

  const onHasDataVendors = (rawVendors: GroupedVendors) => (
    acc: GroupedVendors,
    name: string
  ) => {
    const dataAmount = rawVendors[name].length;
    if (!dataAmount) console.log(deletingNoDataEntry(name));
    return dataAmount ? {...acc, [name]: rawVendors[name]} : acc;
  };

  return {
    filters: {
      byStatus,
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

function _getConditionalConstants(isPurchase: boolean) {
  const vendorNameSortColumnName = isPurchase
    ? PURCHASE_DATA.UTIL.SORT_COLUMNS.VENDOR_NAME
    : REPAIR_DATA.UTIL.SORT_COLUMNS.VENDOR_NAME;

  const vendorCodeSortColumnName = isPurchase
    ? PURCHASE_DATA.UTIL.SORT_COLUMNS.VENDOR_CODE
    : REPAIR_DATA.UTIL.SORT_COLUMNS.VENDOR_CODE;

  const roNumberHeaderName = isPurchase
    ? PURCHASE_DATA.COLUMN.RO_NUMBER
    : REPAIR_DATA.COLUMN.RO_NUMBER;

  const responsibleFilterColumn = isPurchase
    ? PURCHASE_DATA.UTIL.FILTER_COLUMNS.RESPONSIBLE
    : REPAIR_DATA.UTIL.FILTER_COLUMNS.RESPONSIBLE;

  const buyerManagementFilterColumn = isPurchase
    ? PURCHASE_DATA.UTIL.FILTER_COLUMNS.BUYER_MANAGEMENT
    : REPAIR_DATA.UTIL.FILTER_COLUMNS.BUYER_MANAGEMENT;

  const poStatusFilterColumn = isPurchase
    ? PURCHASE_DATA.UTIL.FILTER_COLUMNS.PO_STATUS
    : REPAIR_DATA.UTIL.FILTER_COLUMNS.PO_STATUS;

  return {
    vendorNameSortColumnName,
    vendorCodeSortColumnName,
    roNumberHeaderName,
    responsibleFilterColumn,
    buyerManagementFilterColumn,
    poStatusFilterColumn,
  };
}

function _getUtilitiesToEvaluateEmails() {
  const purchaseOrdersGenerator = (
    vendorName: string,
    vendorEmail: string,
    headerNumbers: Partial<typeof TEMPLATE.UTIL.COLUMN_NAME>
  ) => (curr: PurchaseOrder[], row: string[]) =>
    curr.concat({
      vendorName: vendorName ?? NOT_FOUND.VENDOR_NAME,
      purchaseOrder: row[headerNumbers.purchaseOrder] || null,
      line: row[headerNumbers.line] || null,
      partNumber: row[headerNumbers.partNumber] || null,
      status: row[headerNumbers.status] || null,
      esd: row[headerNumbers.esd] || null,
      shippedDate: row[headerNumbers.shippedDate] || null,
      qtyShipped: row[headerNumbers.qtyShipped] || null,
      qtyPending: row[headerNumbers.qtyPending] || null,
      awb: row[headerNumbers.awb] || null,
      comments: row[headerNumbers.comments] || null,
      audit: {
        vendorEmail: String(vendorEmail).toLocaleLowerCase() || null,
        isPurchase: !!row[headerNumbers.line],
        updatedInSheet: false,
      },
    });

  const spreadsheetValuesAndHeaderNumbersGenerator = (
    spreadsheet: Spreadsheet,
    templateHeaders: string[][]
  ) => {
    // This should never fail if previous method validation was right
    const sheet = spreadsheet.getSheets().find(inSheet => {
      const lastColumn = inSheet.getLastColumn();
      return inSheet
        .getRange(2, 1, 1, lastColumn ? lastColumn : 1)
        .getValues()[0]
        .includes(TEMPLATE.COLUMN.PURCHASE_ORDER);
    });

    let headers: string[] = sheet
      .getRange(2, 1, 1, sheet.getLastColumn())
      .getValues()[0];

    // Find PO column number if sheet columns was modified
    const poNumberColumnNumber =
      headers.indexOf(TEMPLATE.UTIL.COLUMN_NAME.purchaseOrder) + 1;
    const commentColumnNumber =
      headers.indexOf(TEMPLATE.UTIL.COLUMN_NAME.comments) + 1;

    headers = headers.slice(
      poNumberColumnNumber - 1,
      commentColumnNumber ? commentColumnNumber : poNumberColumnNumber + 10
    );

    // Minus header rows
    const numberOfRows = sheet.getLastRow() - 2;

    const headerNumbers = headers.reduce((acc, header, i) => {
      const templateHeader = templateHeaders.find(
        ([, name]) => name === header
      );
      return templateHeader ? {...acc, [templateHeader[0]]: i} : acc;
    }, {} as Partial<typeof TEMPLATE.UTIL.COLUMN_NAME>);

    const spreadsheetValues: string[][] = sheet
      .getRange(
        3,
        poNumberColumnNumber,
        numberOfRows,
        commentColumnNumber ? commentColumnNumber : 10
      )
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
      setRepairFilterColumnNumbers(filterColumnNumbers, headerNumber);
      setRepairSortColumnNumbers(sortColumnNumber, headerNumber);
      break;
    case DATA_ORIGIN.PURCHASE:
      setPurchaseFilterColumnNumbers(filterColumnNumbers, headerNumber);
      setPurchaseSortColumnNumbers(sortColumnNumber, headerNumber);
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

function setPurchaseSortColumnNumbers(
  sortColumnNumber: SortColumns,
  headerNumber: HeaderNumber
) {
  sortColumnNumber[PURCHASE_DATA.UTIL.SORT_COLUMNS.VENDOR_NAME] =
    headerNumber[PURCHASE_DATA.UTIL.SORT_COLUMNS.VENDOR_NAME];
  sortColumnNumber[PURCHASE_DATA.UTIL.SORT_COLUMNS.VENDOR_CODE] =
    headerNumber[PURCHASE_DATA.UTIL.SORT_COLUMNS.VENDOR_CODE];
}

function setRepairSortColumnNumbers(
  sortColumnNumber: SortColumns,
  headerNumber: HeaderNumber
) {
  sortColumnNumber[REPAIR_DATA.UTIL.SORT_COLUMNS.VENDOR_NAME] =
    headerNumber[REPAIR_DATA.UTIL.SORT_COLUMNS.VENDOR_NAME];
  sortColumnNumber[REPAIR_DATA.UTIL.SORT_COLUMNS.VENDOR_CODE] =
    headerNumber[REPAIR_DATA.UTIL.SORT_COLUMNS.VENDOR_CODE];
}

function setRepairFilterColumnNumbers(
  filterColumnNumbers: FilterColumns,
  headerNumber: HeaderNumber
) {
  filterColumnNumbers[REPAIR_DATA.UTIL.FILTER_COLUMNS.STATUS] ??=
    headerNumber[REPAIR_DATA.UTIL.FILTER_COLUMNS.STATUS];
  filterColumnNumbers[REPAIR_DATA.UTIL.FILTER_COLUMNS.SYSTEM] ??=
    headerNumber[REPAIR_DATA.UTIL.FILTER_COLUMNS.SYSTEM];
  filterColumnNumbers[REPAIR_DATA.UTIL.FILTER_COLUMNS.RESPONSIBLE] ??=
    headerNumber[REPAIR_DATA.UTIL.FILTER_COLUMNS.RESPONSIBLE];
  filterColumnNumbers[REPAIR_DATA.UTIL.FILTER_COLUMNS.PO_STATUS] ??=
    headerNumber[REPAIR_DATA.UTIL.FILTER_COLUMNS.PO_STATUS];
  filterColumnNumbers[REPAIR_DATA.UTIL.FILTER_COLUMNS.BUYER_MANAGEMENT] ??=
    headerNumber[REPAIR_DATA.UTIL.FILTER_COLUMNS.BUYER_MANAGEMENT];
}

function setPurchaseFilterColumnNumbers(
  filterColumnNumbers: FilterColumns,
  headerNumber: HeaderNumber
) {
  filterColumnNumbers[PURCHASE_DATA.UTIL.FILTER_COLUMNS.FUP_STATUS_ACTUAL] ??=
    headerNumber[PURCHASE_DATA.UTIL.FILTER_COLUMNS.FUP_STATUS_ACTUAL];
  filterColumnNumbers[PURCHASE_DATA.UTIL.FILTER_COLUMNS.ACK] ??=
    headerNumber[PURCHASE_DATA.UTIL.FILTER_COLUMNS.ACK];
  filterColumnNumbers[PURCHASE_DATA.UTIL.FILTER_COLUMNS.RESPONSIBLE] ??=
    headerNumber[PURCHASE_DATA.UTIL.FILTER_COLUMNS.RESPONSIBLE];
  filterColumnNumbers[PURCHASE_DATA.UTIL.FILTER_COLUMNS.PO_STATUS] ??=
    headerNumber[PURCHASE_DATA.UTIL.FILTER_COLUMNS.PO_STATUS];
  filterColumnNumbers[PURCHASE_DATA.UTIL.FILTER_COLUMNS.BUYER_MANAGEMENT] ??=
    headerNumber[PURCHASE_DATA.UTIL.FILTER_COLUMNS.BUYER_MANAGEMENT];
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
  return spreadsheet.getSheets().some(sheet => {
    const lastColumn = sheet.getLastColumn();
    return sheet
      .getRange(2, 1, 1, lastColumn ? lastColumn : 1)
      .getValues()[0]
      .includes(TEMPLATE.COLUMN.LINE);
  });
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
