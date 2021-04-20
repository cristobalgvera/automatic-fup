import {PO_STATUS} from '../enum/po-status.enum';
import {Audit} from './shared/audit.schema';

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
