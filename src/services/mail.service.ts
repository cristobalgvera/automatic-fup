import Blob = GoogleAppsScript.Base.Blob;
import Folder = GoogleAppsScript.Drive.Folder;
import Sheet = GoogleAppsScript.Spreadsheet.Sheet;
import Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;
import { VendorContact } from '../util/interfaces/vendor-contact';
import { createChildFolderFromFolderId, excelToSheet, sheetToExcel } from './drive.service';
import { ColumnNumbers } from '../util/interfaces/column-numbers';
import { writeInSheet } from './write.service';
import { userConfirmation } from './utility.service';
import { FOLDER_ID, UI } from '../../config';

function sendSheetToVendor( vendorContact: VendorContact, vendorSpreadsheet: Spreadsheet ) {
    const vendorExcel = sheetToExcel(vendorSpreadsheet, vendorContact.name);

    // Return true or false based on success of email send
    return _sendExcelTo(vendorContact, [vendorExcel]);
}

function sendEmail(
    vendorSheet: Sheet,
    vendorData: string[],
    columnNumbers: ColumnNumbers,
    vendorContact: VendorContact,
    vendorSpreadsheet: Spreadsheet,
) {
    // Put collected data in an empty vendor file
    writeInSheet(vendorSheet, vendorData, columnNumbers, true);

    let success: boolean;
    do {
        // Convert spreadsheet into Excel file and send it to vendor
        success = sendSheetToVendor(vendorContact, vendorSpreadsheet);

        // In case of email sending fail, user can retry
        if (!success && !userConfirmation(UI.MODAL.errorSendingEmailTo(vendorContact)))
            success = true;
    } while (!success);
}

function _sendExcelTo( { name, email }: VendorContact, attachments: Blob[] ) {
    // Use template html file to write mail
    const html = HtmlService.createTemplateFromFile('src/assets/mail');

    // Edit data variable of template html
    html.data = name;

    // Create real html from template one (whit all variable data)
    const htmlBody = html.evaluate().getContent();

    try {
        MailApp.sendEmail({
            to: email,
            htmlBody,
            attachments,
            subject: UI.MAIL.subject(),
            replyTo: UI.MAIL.REPLY_TO,
            name: UI.MAIL.NAME,
        });

        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
}

// Function to use inside of template html files to modularize responsibilities
function include( filename ) {
    return HtmlService.createHtmlOutputFromFile(filename)
        .getContent();
}

function mockProcess() {
    const folder = createChildFolderFromFolderId(FOLDER_ID.MAIN, 'test');

    getOpenOrders('cristobal.gajardo@latam.com', '2021/3/15', folder);
}

function getOpenOrders( email: string, after: string, folder: Folder ) {
    const query = `from:(${email}) filename:xlsx after:${after}`;

    GmailApp.search(query).forEach(mail => {
        mail.getMessages().forEach(message => {
            console.log(message.getSubject());
            const attachments = message.getAttachments();
            attachments.forEach(attachment => {
                const sheet = excelToSheet(attachment.copyBlob(), folder);
                console.log(sheet);
            });
        });
    });
}

export {
    sendSheetToVendor,
    sendEmail,
};
