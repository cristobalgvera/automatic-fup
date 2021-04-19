import {DATA_ORIGIN} from '../util/enum/data-origin.enum';
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

function createVendorFiles(isPurchase: boolean, automatic?: boolean) {
  console.warn(
    `RETRIEVING VENDORS CONTACTS TO OBTAIN ${
      isPurchase ? 'PURCHASES' : 'REPAIRS'
    } FUP DATA START`
  );
  const {vendors, headers, vendorsContact} = isPurchase
    ? extractPurchaseDataByVendorName(automatic)
    : extractRepairDataByVendorName(automatic);
  console.warn(
    `RETRIEVING VENDORS CONTACTS TO OBTAIN ${
      isPurchase ? 'PURCHASES' : 'REPAIRS'
    } FUP DATA END`
  );

  // User cancel operation
  if (!vendorsContact) return;

  console.warn('FOLDER CREATION START');
  const {
    templateSpreadsheet,
    registriesFolder,
  } = getTemplateAndCreateFolderForRegistries(
    isPurchase ? DATA_ORIGIN.PURCHASE : DATA_ORIGIN.REPAIR
  );
  const columnNumbers = getColumnNumbers(
    templateSpreadsheet,
    headers,
    isPurchase
  );
  console.warn('FOLDER CREATION END');

  console.warn('SHEETS CREATION START');
  // Create sheet files and return a send email to vendor action for each one
  const sendEmails = createSheetFiles(
    vendors,
    vendorsContact,
    templateSpreadsheet,
    registriesFolder,
    columnNumbers,
    automatic
  );
  console.warn('SHEETS CREATION END');

  console.warn('EMAIL SENDING START');
  const mailedIds = sendEmails
    .map(sendEmail => sendEmail(isPurchase))
    .filter(id => id);
  console.warn('EMAIL SENDING END');

  console.warn('UPDATE DB SHEET SEND DATE START');
  updateDbSheetSendDates(mailedIds);
  console.warn('UPDATE DB SHEET SEND DATE END');
}

export {createVendorFiles};
