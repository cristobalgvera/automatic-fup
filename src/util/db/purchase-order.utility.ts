import {FIREBASE} from '../../config';
import {database} from '../../db';
import {generatePurchaseOrderId} from '../../service/utility.service';
import {PurchaseOrderCollection} from '../schema/purchase-order-collection.schema';
import {PurchaseOrder} from '../schema/purchase-order.schema';

export type PurchaseOrderNoAudited = Omit<PurchaseOrder, 'audit'>;

function _setAuditData(purchaseOrder: PurchaseOrder, isUpdate?: boolean) {
  purchaseOrder.id ??= generatePurchaseOrderId(purchaseOrder);

  if (!isUpdate) {
    purchaseOrder.audit.creationDate = new Date();
    purchaseOrder.audit.createdBy = Session.getActiveUser().getEmail();
  } else {
    purchaseOrder.audit.updateDate = new Date();
    purchaseOrder.audit.updatedBy = Session.getActiveUser().getEmail();
  }
}

function _auditingEach(
  acc: PurchaseOrderCollection,
  purchaseOrder: PurchaseOrder
): PurchaseOrderCollection {
  _setAuditData(purchaseOrder);
  const stored: PurchaseOrder = database.getData(
    `${FIREBASE.PATH.PURCHASE_ORDER.BASE}/${purchaseOrder.id}`
  );
  if (!stored?.id) return {...acc, [purchaseOrder.id]: {...purchaseOrder}};

  purchaseOrder.audit.creationDate = new Date(stored.audit.creationDate);
  purchaseOrder.audit.createdBy = stored.audit.createdBy;
  _setAuditData(purchaseOrder, true);

  return {...acc, [purchaseOrder.id]: {...purchaseOrder}};
}

export {_setAuditData, _auditingEach};
