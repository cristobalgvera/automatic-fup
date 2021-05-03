import {PO_STATUS} from '../util/enum/po-status.enum';
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
      PO_STATUS: 'PO Status',
      RESPONSIBLE: 'Responsable Acción',
      BUYER_MANAGEMENT: 'Gestión',
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
      RESPONSIBLE: [RESPONSIBLE.VENDOR].map(String),
      PO_STATUS: [
        PO_STATUS.NOT_RECEIVED,
        PO_STATUS.AWAITING_ISSUED_BUYER,
        PO_STATUS.AWAITING_CIA_PAYMENT,
      ].map(String),
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
      RESPONSIBLE: 'Responsable Acción',
    },
  },
};

export {PURCHASE_DATA};
