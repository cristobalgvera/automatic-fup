import {FIREBASE} from '../../config';
import {database} from '../../db';
import {PurchaseOrderCollection} from '../schema/collection/purchase-order-collection.schema';
import {
  cleanUpUndefined,
  generatePurchaseOrderId,
  isValidDate,
} from '../../service/utility.service';
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

function _convertProperties(purchaseOrder: PurchaseOrder) {
  purchaseOrder.line = purchaseOrder.line ? +purchaseOrder.line : 1;

  purchaseOrder.qtyShipped = purchaseOrder.qtyShipped
    ? +purchaseOrder.qtyShipped
    : undefined;
  purchaseOrder.qtyShipped === undefined && delete purchaseOrder.qtyShipped;

  purchaseOrder.qtyPending = purchaseOrder.qtyPending
    ? +purchaseOrder.qtyPending
    : undefined;

  purchaseOrder.esd = isValidDate(new Date(purchaseOrder.esd));
  purchaseOrder.shippedDate = isValidDate(new Date(purchaseOrder.shippedDate));

  purchaseOrder.audit!.creationDate = isValidDate(
    new Date(purchaseOrder.audit!.creationDate)
  );

  purchaseOrder.audit!.updateDate = isValidDate(
    new Date(purchaseOrder.audit!.updateDate)
  );

  return cleanUpUndefined(purchaseOrder);
}

export {_setAuditData, _auditingEach, _convertProperties};
