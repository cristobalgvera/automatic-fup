export interface PurchaseOrder {
  id?: string;
  vendorName: string;
  purchaseOrder: string;
  line?: number;
  partNumber: string;
  status?: PO_STATUS | string;
  esd?: Date | string;
  shippedDate?: Date | string;
  qtyShipped?: number;
  awb?: string;
  comments?: string;
  creationDate?: Date;
  updateDate?: Date;
}

export enum PO_STATUS {
  NOT_SHIPPED_YET,
  SHIPPED,
  NOT_RECEIVED,
}
