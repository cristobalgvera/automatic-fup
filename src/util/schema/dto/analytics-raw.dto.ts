import {DATA_ORIGIN} from '../../enum/data-origin.enum';
import {PO_STATUS} from '../../enum/po-status.enum';

export interface AnalyticsRaw {
  id: string;
  purchaseOrder: string;
  line: number;
  qtyPending: number;
  partNumber: string;
  status: PO_STATUS;
  esd: Date;
  shippedDate: Date;
  qtyShipped: number;
  awb: string;
  comments: string;
  sendDate: Date;
  creationDate: Date;
  updateDate: Date;
  dataOrigin: DATA_ORIGIN;
  conflictive: boolean;
  vendorName: string;
  vendorEmail: string;
}
