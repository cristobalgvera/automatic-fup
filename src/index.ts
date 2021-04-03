import { consolidateOpenOrders, createSheetFiles, getTemplateAndCreateFolder } from './service/drive.service';
import { extractFupDataGroupedByVendorName, getColumnNumbers } from './service/read.service';
import { UI } from '../config';

// Found the GitHub project to pull in https://github.com/cristobalgvera/automatic-fup

function onOpen() {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu(UI.MENU.TITLE)
        .addSubMenu(ui.createMenu(UI.MENU.SUBMENU_1.TITLE)
            .addItem(UI.MENU.SUBMENU_1.ITEM.A, 'createFileForEachVendor'))
        .addSubMenu(ui.createMenu(UI.MENU.SUBMENU_2.TITLE)
            .addItem(UI.MENU.SUBMENU_2.ITEM.A, 'consolidatePurchases')
            .addItem(UI.MENU.SUBMENU_2.ITEM.B, 'consolidateRepairs'))
        .addToUi();
}

function createFileForEachVendor() {
    const { vendors, headers, vendorsContact } = extractFupDataGroupedByVendorName();

    // User cancel operation
    if (!vendorsContact) return;

    const { templateSpreadsheet, registriesFolder } = getTemplateAndCreateFolder();
    const columnNumbers = getColumnNumbers(templateSpreadsheet, headers);

    // Create sheet files and return a send email to vendor action for each one
    const sendEmails = createSheetFiles(vendors, vendorsContact, templateSpreadsheet, registriesFolder, columnNumbers);
    sendEmails.forEach(sendEmail => sendEmail());
}

function consolidatePurchases() {
    consolidateOpenOrders();
}

function consolidateRepairs() {
    consolidateOpenOrders(false);
}
