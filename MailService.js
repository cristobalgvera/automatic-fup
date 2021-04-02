function sendSheetToVendor(vendorContact, vendorFile) {
  const vendorExcel = sheetToExcel(vendorFile.getId(), vendorContact.name);
  _sendExcelTo(vendorContact, [vendorExcel]);
}

function _sendExcelTo({ name, email }, attachments) {
  try {
    const html = HtmlService.createTemplateFromFile('Mail');
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

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
    .getContent();
}

function mockProcess() {
  const folder = createChildFolderFromFolderId(FOLDER_ID.MAIN, 'test');

  getOpenOrders('cristobal.gajardo@latam.com', '2021/3/15', folder.getId());
}

function getOpenOrders(email, after, folderId) {
  const query = `from:(${email}) filename:xlsx after:${after}`;

  GmailApp.search(query).forEach(mail => {
    mail.getMessages().forEach(message => {
      console.log(message.getSubject());
      const attachments = message.getAttachments();
      attachments.forEach(attachment => {
        const sheet = createSheetFromExcel(attachment.copyBlob(), folderId);
        console.log(sheet);
      })
    })
  })
}