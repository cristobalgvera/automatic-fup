import {AnalyticsRaw} from '../util/schema/dto/analytics-raw.dto';

type ColumnName = Required<
  {
    [attribute in keyof AnalyticsRaw]: string;
  }
>;

const ANALYTICS = {
  ID: '1mjewy9oQv3ctYh5g6tl8juCp-he22OHNHxLmjNnDlB8',
  SHEET: {
    RAW_FIREBASE: 'RAW Firebase',
    CONSOLIDATED_PROCUREMENT: 'Consolidado Procurement',
  },
  COLUMN: {
    FIREBASE: <ColumnName>{
      id: 'Key',
      purchaseOrder: 'Purchase Order',
      line: 'Line',
      qtyPending: 'Qty Pending',
      partNumber: 'Part Number',
      status: 'Status',
      esd: 'ESD',
      shippedDate: 'Shipped Date',
      qtyShipped: 'Qty Shipped',
      awb: 'AWB',
      comments: 'Comments',
      sendDate: 'Send Date',
      creationDate: 'Creation Date',
      updateDate: 'Update Date',
      dataOrigin: 'Data Origin',
      conflictive: 'Conflictive',
      vendorName: 'Vendor Name',
      vendorEmail: 'Vendor Email',
    },
  },
};

export {ANALYTICS};
