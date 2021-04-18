export interface PurchaseOrder {
  id?: string;
  vendorName: string;
  purchaseOrder: string;
  line?: number;
  partNumber: string;
  status?: PO_STATUS;
  esd?: Date;
  shippedDate?: Date;
  qtyShipped?: number;
  awb?: string;
  comments?: string;
  audit?: Audit;
}

export interface Audit {
  vendorEmail?: string;
  creationDate?: Date;
  createdBy?: string;
  updateDate?: Date;
  updatedBy?: string;
}

export enum PO_STATUS {
  NOT_RECEIVED = 'Not received',
  CORE_RETURN = 'Core return',
  TO_BE_QUOTED = 'To be quoted',
  AWAITING_QUOTE_APPROVAL = 'Awaiting quote approval',
  AWAITING_CIA_PAYMENT = 'Awaiting CIA payment',
  UNDER_REPAIR_PROCESS = 'Under repair process',
  SHIPPED = 'Shipped',
  SCRAPPED = 'Scrapped',
  CANCELLED = 'Cancelled',
  NOT_SHIPPED_YET = 'Not shipped yet',
  AWAITING_ISSUED_BUYER = 'Awaiting issued buyer',
}
