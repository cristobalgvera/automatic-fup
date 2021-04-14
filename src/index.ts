import {
  consolidateOpenOrders,
  createSheetFiles,
  getTemplateAndCreateFolderForRegistries,
} from './service/drive.service';
import {
  extractFupDataGroupedByVendorName,
  getColumnNumbers,
} from './service/read.service';
import {COMMON, UI} from './config';
import {getOpenOrdersFromVendors} from './service/mail.service';
import {PurchaseOrder} from './util/schema/purchase-order.schema';
import {purchaseOrderService} from './service/purchase-order.service';

/****************************************************************
 * Automatic FUP
 * Designed by Cristóbal Gajardo Vera
 * https://github.com/cristobalgvera/automatic-fup
 *****************************************************************/

function test() {
  const dataGenerator = (howMany: number) => {
    const generatedData: PurchaseOrder[] = [];
    for (let i = 0; i < howMany; i++) {
      generatedData.push({
        vendorName: 'COLLINS',
        partNumber: `${Math.floor(Math.random() * 899999) + 100000}`,
        purchaseOrder: `PO${Math.floor(Math.random() * 899999) + 100000}`,
        comments: 'TEST!',
      });
    }
    return generatedData;
  };

  const data = dataGenerator(5);

  const returnedData = purchaseOrderService.saveAll(data);
  console.log(returnedData);
}

function test2() {
  // const data = purchaseOrderService.getAll({
  //   orderBy: 'vendorName',
  //   equalTo: 'BOEING',
  // });

  const data = purchaseOrderService.getAll({
    orderBy: '$key',
    limitToFirst: '3',
  });

  console.log(data);
}

function test3() {
  const data = purchaseOrderService.getOne('PO298432-1');
  console.log(data);
}

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu(UI.MENU.TITLE)
    .addSubMenu(
      ui
        .createMenu(UI.MENU.SUBMENU_1.TITLE)
        .addItem(UI.MENU.SUBMENU_1.ITEM.A, 'createFileForEachVendor')
    )
    .addSubMenu(
      ui
        .createMenu(UI.MENU.SUBMENU_2.TITLE)
        .addItem(UI.MENU.SUBMENU_2.ITEM.A, 'consolidatePurchases')
        .addItem(UI.MENU.SUBMENU_2.ITEM.B, 'consolidateRepairs')
    )
    .addToUi();
}

function createFileForEachVendor() {
  const {
    vendors,
    headers,
    vendorsContact,
  } = extractFupDataGroupedByVendorName();

  // User cancel operation
  if (!vendorsContact) return;

  const {
    templateSpreadsheet,
    registriesFolder,
  } = getTemplateAndCreateFolderForRegistries();
  const columnNumbers = getColumnNumbers(templateSpreadsheet, headers);

  // Create sheet files and return a send email to vendor action for each one
  const sendEmails = createSheetFiles(
    vendors,
    vendorsContact,
    templateSpreadsheet,
    registriesFolder,
    columnNumbers
  );
  sendEmails.forEach(sendEmail => sendEmail());
}

function consolidatePurchases() {
  consolidateOpenOrders();
}

function consolidateRepairs() {
  consolidateOpenOrders(false);
}

function getOpenOrders() {
  getOpenOrdersFromVendors(COMMON.EMAIL.LATAM_SENDER, '2021/4/4');
}
