import {LOG_STATE} from '../enum/log-state.enum';

type GmailMessage = GoogleAppsScript.Gmail.GmailMessage;

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

function retrievingData(isPurchase: boolean) {
  return `Retrieving ${isPurchase ? 'purchases' : 'repairs'} data`;
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

function gettingInfoFrom(message: GmailMessage, from: string) {
  return `Getting info from '${message.getSubject()}' sended by '${from}' on '${message
    .getDate()
    .toISOString()}'`;
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
  id: string,
  order: string,
  line: number,
  rowNumber: number,
  isPurchase: boolean
) {
  return `Updating '${id} (${order}-${line ?? 1})', row '${rowNumber}' in ${
    isPurchase ? 'purchases' : 'repairs'
  } FUP data`;
}

function notFoundPurchaseOrderInFup(
  id: string,
  order: string,
  line: number,
  isPurchase: boolean
) {
  return `'Not found PO: ${id} (${order}-${line ?? 1})' in ${
    isPurchase ? 'purchases' : 'repairs'
  } FUP data`;
}

function automaticSendDisabled() {
  return 'AUTOMATIC SEND HAS BEEN DISABLED';
}

function errorSendingEmailTo(id: string) {
  return `Error sending email to ${id}, retrying...`;
}

export {
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
};
