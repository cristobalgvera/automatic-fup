import {COMMON, UI} from '../config';
import {PurchaseOrder} from '../util/interface/db/purchase-order.interface';

const today = () => new Date().toLocaleDateString(COMMON.UTIL.LOCALE);
const todayNoYear = () => Utilities.formatDate(new Date(), 'GMT-3', 'dd-MMM');

const generatePurchaseOrderId = ({purchaseOrder, line}: PurchaseOrder) =>
  `${purchaseOrder}-${line ?? 1}`;

// Utility method extracted from StackOverflow
function toCamelCase(str: string) {
  return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => {
    if (+match === 0) return ''; // or if (/\s+/.test(match)) for white spaces

    return index === 0 ? match.toLowerCase() : match.toUpperCase();
  });
}

function userConfirmation(title: string, vendorsNames?: string[]) {
  const ui = SpreadsheetApp.getUi();

  // If the is not vendor names alternative alert will be displayed
  if (!vendorsNames) {
    const response = ui.alert(UI.MODAL.ERROR, title, ui.ButtonSet.OK_CANCEL);
    return response === ui.Button.OK;
  }

  // Create a list-like string to display in alert modal
  const vendorsToSendEmails = vendorsNames.reduce(
    (word, name, i, arr) =>
      arr[i + 1] ? word.concat(`- ${name}\n`) : word.concat(`- ${name}`),
    ''
  );

  const response = ui.alert(title, vendorsToSendEmails, ui.ButtonSet.OK_CANCEL);
  return response === ui.Button.OK;
}

function removeExtension(fileName: string, extension: string) {
  // In case of extension came with an initial dot
  if (extension.startsWith('.')) extension = extension.slice(1);

  return fileName.replace(`.${extension}`, '');
}

function addSuffix(name: string, suffix: string, addSpace = true) {
  return `${name}${addSpace ? ' ' : ''}${suffix}`;
}

function validateEmail(email: string) {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email.toLowerCase());
}

function obtainEmail(sender: string) {
  const start = sender.lastIndexOf('<') + 1;
  const end = sender.lastIndexOf('>');
  return sender.substring(start, end);
}

export {
  removeExtension,
  toCamelCase,
  today,
  todayNoYear,
  userConfirmation,
  addSuffix,
  validateEmail,
  obtainEmail,
  generatePurchaseOrderId,
};
