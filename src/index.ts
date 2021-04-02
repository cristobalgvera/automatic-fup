import { UI, TEMPLATE } from '../config/app.settings';
import { consolidateOpenOrders, getTemplateAndCreateFolder } from './services/drive.service';
import { extractFupDataGroupedByVendorName, getColumnNumbers } from './services/read.service';
import { writeInSheet } from './services/write.service';
import { sendSheetToVendor } from './services/mail.service';

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

    if (!vendorsContact) return;

    const { templateFile, registriesFolder } = getTemplateAndCreateFolder();
    const columnNumbers = getColumnNumbers(templateFile, headers);

    Object.entries(vendors).forEach(vendor => {
        const [vendorId, vendorData] = vendor;
        const vendorContact = vendorsContact.find(contact => contact.id === vendorId);

        const vendorFile = templateFile.makeCopy()
            .setName(vendorContact.name);
        registriesFolder.addFile(vendorFile);
        const vendorSheet = SpreadsheetApp.open(vendorFile)
            .getSheetByName(TEMPLATE.SHEET.PURCHASE);

        writeInSheet(vendorSheet, vendorData, columnNumbers, true);
        sendSheetToVendor(vendorContact, vendorFile);
    });
}

function consolidatePurchases() {
    consolidateOpenOrders();
}

function consolidateRepairs() {
    consolidateOpenOrders(false);
}
