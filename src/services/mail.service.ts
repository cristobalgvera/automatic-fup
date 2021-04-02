import File = GoogleAppsScript.Drive.File;
import { VendorContact } from '../util/interfaces/vendor-contact';
import { createChildFolderFromFolderId, excelToSheet, sheetToExcel } from './drive.service';
import Blob = GoogleAppsScript.Base.Blob;
import { FOLDER_ID, UI } from '../../config/app.settings';
import Folder = GoogleAppsScript.Drive.Folder;

function sendSheetToVendor( vendorContact: VendorContact, vendorFile: File ) {
    const vendorExcel = sheetToExcel(vendorFile.getId(), vendorContact.name);
    _sendExcelTo(vendorContact, [vendorExcel]);
}

function _sendExcelTo( { name, email }: VendorContact, attachments: Blob[] ) {
    try {
        const html = HtmlService.createTemplateFromFile('src/assets/mail');
        html.data = name;
        const htmlBody = html.evaluate().getContent();

        MailApp.sendEmail({
            to: email,
            htmlBody,
            attachments,
            subject: UI.MAIL.subject(),
            replyTo: UI.MAIL.REPLY_TO,
            name: UI.MAIL.NAME,
        });
    } catch (e) {
        console.error(e);
    }
}

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

export { sendSheetToVendor };
