import {DATA_ORIGIN} from '../util/enum/data-origin.enum';
import {
  getTemplateAndCreateFolderForRegistries,
  createSheetFiles,
} from './drive.service';
import {
  extractPurchaseDataByVendorName,
  getColumnNumbers,
  extractRepairDataByVendorName,
} from './read.service';

// To be manual
function createFileForEachPurchaseVendor(automatic?: boolean) {
  console.warn('RETRIEVING VENDORS CONTACTS TO OBTAIN PURCHASE FUP DATA START');
  const {vendors, headers, vendorsContact} = extractPurchaseDataByVendorName(
    automatic
  );
  console.warn('RETRIEVING VENDORS CONTACTS TO OBTAIN PURCHASE FUP DATA END');

  // User cancel operation
  if (!vendorsContact) return;

  console.warn('FOLDER CREATION START');
  const {
    templateSpreadsheet,
    registriesFolder,
  } = getTemplateAndCreateFolderForRegistries(DATA_ORIGIN.PURCHASE);
  const columnNumbers = getColumnNumbers(templateSpreadsheet, headers, true);
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
  sendEmails.forEach(sendEmail => sendEmail());
  console.warn('EMAIL SENDING END');
}

// To be manual
function createFileForEachRepairVendor(automatic?: boolean) {
  console.warn('RETRIEVING VENDORS CONTACTS TO OBTAIN REPAIR FUP DATA START');
  const {vendors, headers, vendorsContact} = extractRepairDataByVendorName(
    automatic
  );
  console.warn('RETRIEVING VENDORS CONTACTS TO OBTAIN REPAIR FUP DATA END');

  // User cancel operation
  if (!vendorsContact) return;

  console.warn('FOLDER CREATION START');
  const {
    templateSpreadsheet,
    registriesFolder,
  } = getTemplateAndCreateFolderForRegistries(DATA_ORIGIN.REPAIR);
  const columnNumbers = getColumnNumbers(templateSpreadsheet, headers, false);
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
  sendEmails.forEach(sendEmail => sendEmail(false));
  console.warn('EMAIL SENDING END');
}

export {createFileForEachPurchaseVendor, createFileForEachRepairVendor};
