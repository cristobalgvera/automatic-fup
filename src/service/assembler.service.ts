import {DATA_ORIGIN} from '../util/enum/data-origin.enum';
import {LOG_STATE} from '../util/enum/log-state.enum';
import {VendorContact} from '../util/interface/vendor-contact.interface';
import {
  emailSending,
  folderCreation,
  noDataWasFound,
  retrievingContacts,
  sheetCreation,
  storeDataSentLog,
  updateDbSheetSendDateLog,
} from './message.service';
import {
  getTemplateAndCreateFolderForRegistries,
  createSheetFiles,
} from './drive.service';
import {
  getColumnNumbers,
  extractRepairDataByVendorName,
  extractPurchaseDataByVendorName,
} from './read.service';
import {updateDbSheetSendDates} from './write.service';
import {PurchaseOrder} from '../util/schema/purchase-order.schema';
import {storeData} from './analytics.service';
import {COMMON} from '../config';

function createVendorFiles(isPurchase: boolean, automatic?: boolean) {
  console.warn(retrievingContacts(LOG_STATE.START, isPurchase));
  const {vendors, headers, vendorsContact, noData} = isPurchase
    ? extractPurchaseDataByVendorName(automatic)
    : extractRepairDataByVendorName(automatic);
  console.warn(retrievingContacts(LOG_STATE.END, isPurchase));

  // User cancel operation
  if (!vendorsContact) return;

  if (noData) {
    console.log({noData, vendorsContact, vendors});
    _updateDbSheetWhenNoVendors(vendorsContact, isPurchase);
    return;
  }

  console.warn(folderCreation(LOG_STATE.START));
  const {templateSpreadsheet, registriesFolder} =
    getTemplateAndCreateFolderForRegistries(
      isPurchase ? DATA_ORIGIN.PURCHASE : DATA_ORIGIN.REPAIR
    );
  const columnNumbers = getColumnNumbers(
    templateSpreadsheet,
    headers,
    isPurchase
  );
  console.warn(folderCreation(LOG_STATE.END));

  console.warn(sheetCreation(LOG_STATE.START));
  // Create sheet files and return a send email to vendor action for each one
  const sendEmails = createSheetFiles(
    vendors,
    vendorsContact,
    templateSpreadsheet,
    registriesFolder,
    columnNumbers,
    automatic
  );
  console.warn(sheetCreation(LOG_STATE.END));

  console.warn(emailSending(LOG_STATE.START));
  const analyticsData: PurchaseOrder[] = [];

  const mailedIds = sendEmails
    .map(sendEmail => sendEmail(analyticsData, isPurchase))
    .filter(id => id);
  console.warn(emailSending(LOG_STATE.END));

  console.warn(storeDataSentLog(LOG_STATE.START));
  if (analyticsData.length && !COMMON.DEV_MODE())
    storeData(analyticsData, true);
  console.warn(storeDataSentLog(LOG_STATE.END));

  console.warn(updateDbSheetSendDateLog(LOG_STATE.START));
  const checkedIds = vendorsContact.map(({id}) => id);
  updateDbSheetSendDates(
    mailedIds,
    checkedIds,
    isPurchase ? DATA_ORIGIN.PURCHASE : DATA_ORIGIN.REPAIR
  );
  console.warn(updateDbSheetSendDateLog(LOG_STATE.END));
}

function _updateDbSheetWhenNoVendors(
  vendorsContact: VendorContact[],
  isPurchase: boolean
) {
  const checkedIds = vendorsContact.map(({id}) => id);

  console.log(noDataWasFound(isPurchase));

  console.warn(updateDbSheetSendDateLog(LOG_STATE.START));
  updateDbSheetSendDates(
    [],
    checkedIds,
    isPurchase ? DATA_ORIGIN.PURCHASE : DATA_ORIGIN.REPAIR,
    false
  );
  console.warn(updateDbSheetSendDateLog(LOG_STATE.END));
}

export {createVendorFiles};
