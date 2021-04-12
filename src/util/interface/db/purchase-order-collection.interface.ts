import {PurchaseOrder} from './purchase-order.interface';

export interface PurchaseOrderCollection {
  [id: string]: PurchaseOrder;
}
