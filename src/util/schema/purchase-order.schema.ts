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
  audit?: {
    vendorEmail?: string;
    creationDate?: Date;
    createdBy?: string;
    updateDate?: Date;
    updatedBy?: string;
  };
}

export enum PO_STATUS {
  NOT_SHIPPED_YET = '1. Not shipped yet',
  SHIPPED = '2. Shipped',
  NOT_RECEIVED = '3. Not received',
}
