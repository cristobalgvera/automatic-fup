import {RESPONSIBLE} from '../util/enum/responsible.enum';

const PURCHASE_DATA = {
  ID: '1zuf5oNcS5-kZNR5v2pCisgXGRuu2UUqAa0bz_k5WvOM',
  SHEET: {
    ACTUAL: 'Actual',
  },
  COLUMN: {
    RO_NUMBER: 'ORDEN',
    PART_NUMBER: 'OEM_PART_NUMBER',
    LINE: 'ORDEN_LINE',
    VENDOR_NAME: 'VENDOR_NAME',
    VENDOR_CODE: 'VENDOR',
    QTD_PENDENTE: 'QTD_PENDENTE',
  },
  UTIL: {
    FILTER_COLUMNS: {
      FUP_STATUS_ACTUAL: 'FUP_STATUS_ACTUAL',
      ACK: 'ACK',
      RESPONSIBLE: 'RESPONSIBLE',
    },
    FILTERS: {
      FUP_STATUS_ACTUAL: [
        'PENDING SUPPLIER',
        'VENDOR ON HOLD',
        'Shipment scheduled',
        'PEND SUPPLIER',
        'Partial Delivery',
      ],
      ACK: ['SI', 'NO'],
      RESPONSIBLE: [RESPONSIBLE.VENDOR.toString()],
    },
    SORT_COLUMNS: {VENDOR_NAME: 'VENDOR_NAME', VENDOR_CODE: 'VENDOR'},
    VENDOR_DATA_COLUMNS: {
      PO_STATUS: 'PO Status',
      ESD: 'ESD',
      SHIPPED_DATE: 'Shipped Date',
      QTY_SHIPPED: 'Qty Shipped',
      AWB: 'AWB',
      COMMENTS: 'Comments',
      ACTION: 'Acción',
      RESPONSIBLE: 'Responsable',
    },
  },
};

export {PURCHASE_DATA};
