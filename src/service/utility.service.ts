import {COMMON, UI} from '../config';
import {PurchaseOrder} from '../util/schema/purchase-order.schema';

function today() {
  return new Date().toLocaleDateString(COMMON.UTIL.LOCALE);
}

function todayNoYear() {
  return Utilities.formatDate(new Date(), 'GMT-4', 'dd-MMM');
}

function generatePurchaseOrderId({purchaseOrder, line}: PurchaseOrder) {
  return `${purchaseOrder}${line ?? 1}`;
}

// Utility method extracted from StackOverflow
function toCamelCase(str: string) {
  return String(str).replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => {
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

  // If no '<' was found, 'start' will be 0 (-1 + 1)
  if (!start) return sender;

  return sender.substring(start, end);
}

function keysToCamelCase(obj: {}) {
  return Object.entries(obj).reduce(
    (acc, [key, value]) => ({...acc, [toCamelCase(key)]: value}),
    {}
  );
}

function normalizeStringEmailsList(stringEmailList: string) {
  type Separator = {emails: string[]; unknowns: string[]};
  const re = /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;

  const spaceSplit = stringEmailList.split(/[<>()/[\]\\,;:\s"]/);
  const groupByRegExp = spaceSplit
    .map(word => {
      const groupArray = re.exec(word);
      return groupArray ? groupArray[0] : null;
    })
    .filter(val => val);
  // const filterAt = spaceSplit.filter(word => word.includes('@'));
  const {emails, unknowns} = groupByRegExp.reduce(
    (acc: Separator, word: string) => {
      if (validateEmail(word)) acc.emails.push(word);
      else acc.unknowns.push(word);
      return acc;
    },
    {emails: [], unknowns: []}
  );

  unknowns.length && console.error({unknowns});

  return emails.length ? emails : null;
}

function isValidDate(date: any): Date | undefined {
  const valid = !isNaN(date) && date instanceof Date;
  return valid ? date : undefined;
}

function cleanUpUndefined<T>(obj: T): T {
  const t = obj;
  for (const v in t)
    if (typeof t[v] === 'object') cleanUpUndefined(t[v]);
    else if (t[v] === undefined) delete t[v];
  return t;
}

// Evaluate use
function cleanse<T>(obj: T): T {
  Object.keys(obj).forEach(key => {
    // Get this value and its type
    const value = obj[key];
    const type = typeof value;
    if (type === 'object') {
      // Recurse...
      cleanse(value);
      // ...and remove if now "empty" (NOTE: insert your definition of "empty" here)
      if (!Object.keys(value).length) {
        delete obj[key];
      }
    } else if (type === 'undefined') {
      // Undefined, remove it
      delete obj[key];
    }
  });

  return obj;
}

function getDateUtilities(date?: Date) {
  const now = date ?? new Date();
  const iso = now.toISOString();

  const locale = now.toLocaleString();
  const [localeDate, localeTime] = locale.split(' ');
  const [namedDay, namedMonth, , , , timeZone] = now.toString().split(' ');

  const [day, month, year, hour, minute, second] = locale
    .split(/[/ :]/)
    .map(Number);

  const dayOfWeek = now.getDay();
  const isWeekend = dayOfWeek % 6 === 0;

  return {
    now,
    formatted: {iso, localeTime, localeDate},
    separated: {
      year,
      month,
      day,
      hour,
      minute,
      second,
      timeZone,
    },
    utilities: {
      dayOfWeek,
      namedDay,
      namedMonth,
      isWeekend,
    },
  };
}

function validWorkingHours() {
  const {
    separated: {hour},
    utilities: {isWeekend},
  } = getDateUtilities();

  const validHour =
    hour >= COMMON.UTIL.WORKING_HOURS.MIN &&
    hour <= COMMON.UTIL.WORKING_HOURS.MAX;

  return !isWeekend && validHour;
}

function notifyDevMode(automatic?: boolean) {
  if (!(COMMON.DEV_MODE() && !automatic)) return true;

  const ui = SpreadsheetApp.getUi();

  const response = ui.alert(
    'Aplicación en modo de desarrollo',
    'Los correos no serán enviados a los destinatarios esperados, ¿seguro que quieres continuar?',
    ui.ButtonSet.YES_NO
  );

  return response === ui.Button.YES;
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
  keysToCamelCase,
  normalizeStringEmailsList,
  isValidDate,
  cleanUpUndefined,
  getDateUtilities,
  notifyDevMode,
  validWorkingHours,
};
