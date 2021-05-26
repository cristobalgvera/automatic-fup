import {PurchaseOrder} from '../util/schema/purchase-order.schema';

type ColumnName = Required<
  {
    [attribute in keyof Omit<
      PurchaseOrder,
      'id' | 'audit' | 'vendorName'
    >]: string;
  }
>;

const TEMPLATE = {
  IDS: {
    PURCHASE_DATA: '1fUxA_8WbypaQxifwepWa3cr_3CsxQw5a6tko4ZHLpns',
    REPAIR_DATA: '1h1j9mWJxU-IB2QxEqyezgNqM7jh3ppN8q2fDWwDzAdo',
  },
  SHEET: {
    OPEN_ORDERS: 'Open Orders',
  },
  COLUMN: {
    PURCHASE_ORDER: 'Purchase Order',
    PART_NUMBER: 'Part Number',
    LINE: 'Line',
    QTY_PENDING: 'Qty Pending',
  },
  UTIL: {
    LEFT_MOST_COLUMN: 'Comments',
    INITIAL_ROWS: 1000,
    TOTAL_COLUMNS_PURCHASES: 9,
    TOTAL_COLUMNS_REPAIRS: 8,
    COLUMN_NAME: <ColumnName>{
      purchaseOrder: 'Purchase Order',
      partNumber: 'Part Number',
      line: 'Line',
      status: 'P0 Status',
      esd: 'ESD (Date Format)',
      shippedDate: 'Shipped Date (Date Format)',
      qtyShipped: 'Qty Shipped',
      qtyPending: 'Qty Pending',
      awb: 'AWB',
      comments: 'Comments',
    },
  },
};

export {TEMPLATE};
