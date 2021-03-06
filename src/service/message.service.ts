import {COMMON} from '../config';
import {LOG_STATE} from '../util/enum/log-state.enum';
import {PurchaseOrder} from '../util/schema/purchase-order.schema';

type GmailMessage = GoogleAppsScript.Gmail.GmailMessage;
type Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;

function retrievingContacts(logState: LOG_STATE, isPurchase: boolean) {
  return `RETRIEVING VENDORS CONTACTS TO OBTAIN ${
    isPurchase ? 'PURCHASES' : 'REPAIRS'
  } FUP DATA ${logState}`;
}

function folderCreation(logState: LOG_STATE) {
  return `FOLDER CREATION ${logState}`;
}

function sheetCreation(logState: LOG_STATE) {
  return `SHEET CREATION ${logState}`;
}

function emailSending(logState: LOG_STATE) {
  return `EMAIL SENDING ${logState}`;
}

function storeDataSentLog(logState: LOG_STATE) {
  return `STORING SENT DATA ${logState}`;
}

function updateDbSheetSendDateLog(logState: LOG_STATE) {
  return `UPDATE DB SHEET SEND DATE ${logState}`;
}

function fillingAutomaticallySendColumn(logState: LOG_STATE) {
  return `FILLING AUTOMATICALLY SEND EMAIL COLUMN ${logState}`;
}

function noDataWasFound(isPurchase: boolean) {
  return `No data was found in ${
    isPurchase ? 'purchases' : 'repairs'
  } FUP, updating DB sheet...`;
}

function totalVendors(total: number) {
  return `TOTAL: ${total} vendors`;
}

function emptyAutomaticColumns() {
  return 'Automatically send column are empty, filling...';
}

function errorChecking(id: string) {
  return `Error while checking ${id}: ID not found`;
}

function errorUpdatingSendDate(id: string) {
  return `Error while updating send date of ${id}: ID not found`;
}

function updatingSendDate() {
  return 'Updating send date...';
}

function retrievingData(toUpdateInTotal: number, isPurchase: boolean) {
  return `Retrieving ${toUpdateInTotal} open ${
    isPurchase ? 'purchase' : 'repair'
  } orders data`;
}

function updatingOpenOrders(logState: LOG_STATE, isPurchase: boolean) {
  return `UPDATING OPEN ORDERS OF ${
    isPurchase ? 'PURCHASES' : 'REPAIRS'
  } DATA ${logState}`;
}

function updating() {
  return 'Updating...';
}

function sendingEmailTo(name: string, email: string) {
  return `Sending email to ${name} (<${email}>)`;
}

function tryingToGetOpenOrdersFrom(email: string) {
  return `TRYING TO GET OPEN ORDERS FROM '${email}' ACCOUNT`;
}

function noNewEmailsWasFound() {
  return 'No new emails found';
}

function totalReadMessages(read: number) {
  return `Checked: ${read} messages`;
}

function gettingInfoFrom(message: GmailMessage, from: string) {
  return `Getting info from '${message.getSubject()}' sended by '${from}' on '${message.getDate()} - ID: ${message.getId()}'`;
}

function foundSpreadsheetState(spreadsheet: Spreadsheet, isValid: boolean) {
  return `>> Found spreadsheet named '${
    spreadsheet?.getName() ?? 'INVALID_SPREADSHEET'
  }' ${isValid ? '' : 'DOES NOT '}HAVE a valid format`;
}

function howManyVendorsChecked(checkedIds: number) {
  return `Was checked ${checkedIds} vendors`;
}

function creatingSpreadsheet(vendorName: string, sheetName: string) {
  return `Creating '${vendorName}' spreadsheet named '${sheetName}'`;
}

function retrievingInfoFrom(
  vendorName: string,
  vendorId: string,
  vendorCode: string
) {
  return `Retrieving '${vendorName} (${vendorId} - ${vendorCode})' info from FUP data`;
}

function deletingNoDataEntry(name: string) {
  return `Deleting '${name}' entry, has no data`;
}

function updatingPurchaseOrderInFup(
  rowNumber: number,
  purchaseOrder: PurchaseOrder,
  index: number,
  isPurchase: boolean
) {
  const {
    id,
    purchaseOrder: order,
    line,
    vendorName,
    audit: {vendorEmail},
  } = purchaseOrder;

  return `${index} - Updating '${id} (${order}-${
    line ?? 1
  })', row '${rowNumber}' in ${
    isPurchase ? 'purchases' : 'repairs'
  } FUP data -> Contact: ${vendorName} <${String(
    vendorEmail
  ).toLocaleLowerCase()}>`;
}

function notFoundPurchaseOrderInFup(
  purchaseOrder: PurchaseOrder,
  index: number,
  isPurchase: boolean
) {
  const {
    id,
    purchaseOrder: order,
    line,
    vendorName,
    audit: {vendorEmail, creationDate, createdBy},
  } = purchaseOrder;

  return `${index} - Not found PO: '${id} (${order}-${line ?? 1})' in ${
    isPurchase ? 'purchases' : 'repairs'
  } FUP data -> Contact: '${vendorName} <${vendorEmail}>' | Send to: '${createdBy}', registered on '${creationDate}'`;
}

function noOpenOrdersToBeUpdated() {
  return 'NO NEW OPEN ORDERS DETAILS TO BE UPDATED FOUND IN DATABASE';
}

function conflictiveOpenOrdersHasBeenFound(conflictiveOpenOrders: number) {
  return `Database storage will be cleaned. There are ${conflictiveOpenOrders} conflictive open orders to check as updated in sheet`;
}

function automaticSendDisabled() {
  return 'AUTOMATIC SEND HAS BEEN DISABLED';
}

function errorSendingEmailTo(id: string) {
  return `Error sending email to ${id}, retrying...`;
}

function disabledDueDevMode() {
  return 'THIS FUNCTION WAS DISABLED DUE DEV MODE IS ACTIVE';
}

function serviceDisabled(start?: number, end?: number) {
  return `Service is disabled on weekends and between ${
    end ?? COMMON.UTIL.WORKING_HOURS.MAX - 4 // GMT -4
  }:00 and ${
    start ?? COMMON.UTIL.WORKING_HOURS.MIN - 4 // GMT -4
  }:00 o'clock to avoid over request Firebase with unused updates`;
}

function toStoreDataLog({news, toUpdate}: {news: number; toUpdate: number}) {
  return `New information: ${news} | To update information: ${toUpdate}`;
}

function updatingResponsible(toUpdate: number) {
  return `Updating '${toUpdate}' responsible ambiguos states`;
}

function updatingRepairResponsible() {
  return 'Updating repair responsible...';
}

function updatingPurchaseResponsible() {
  return 'Updating purchase responsible...';
}

function gettingVendorsData(isPurchase?: boolean) {
  return `Obteniendo informaci??n de nuevos registros de proveedores en ${
    isPurchase ? 'compras' : 'reparaciones'
  }`;
}

function mergingVendorsData() {
  return 'Juntando informaci??n de actual de proveedores con nueva informaci??n obtenida';
}

export {
  mergingVendorsData,
  gettingVendorsData,
  updatingPurchaseResponsible,
  updatingRepairResponsible,
  updatingResponsible,
  storeDataSentLog,
  toStoreDataLog,
  retrievingContacts,
  folderCreation,
  sheetCreation,
  emailSending,
  updateDbSheetSendDateLog,
  noDataWasFound,
  totalVendors,
  emptyAutomaticColumns,
  fillingAutomaticallySendColumn,
  errorChecking,
  errorUpdatingSendDate,
  updatingSendDate,
  updatingOpenOrders,
  retrievingData,
  updating,
  sendingEmailTo,
  gettingInfoFrom,
  creatingSpreadsheet,
  retrievingInfoFrom,
  deletingNoDataEntry,
  updatingPurchaseOrderInFup,
  notFoundPurchaseOrderInFup,
  automaticSendDisabled,
  errorSendingEmailTo,
  foundSpreadsheetState,
  tryingToGetOpenOrdersFrom,
  noNewEmailsWasFound,
  disabledDueDevMode,
  serviceDisabled,
  totalReadMessages,
  howManyVendorsChecked,
  conflictiveOpenOrdersHasBeenFound,
  noOpenOrdersToBeUpdated,
};
