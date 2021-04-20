import {PurchaseOrder} from '../purchase-order.schema';

export interface PurchaseOrderCollection {
  [id: string]: PurchaseOrder;
}
