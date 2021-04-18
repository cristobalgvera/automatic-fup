import {database} from '.';
import {FIREBASE} from '../config';
import {_auditingEach, _setAuditData} from '../util/db/purchase-order.utility';
import {PurchaseOrderCollection} from '../util/schema/purchase-order-collection.schema';
import {PurchaseOrder} from '../util/schema/purchase-order.schema';

const alreadyExistMessage = (id: string) => `ID: ${id} already exists`;
const doNotExistMessage = (id: string) => `ID: ${id} don't exists`;

function getAll(query?: OptQueryParameters): PurchaseOrder[] {
  return database.getData(FIREBASE.PATH.PURCHASE_ORDER.BASE, query);
}

function getOne(id: string): PurchaseOrder {
  return database.getData(`${FIREBASE.PATH.PURCHASE_ORDER.BASE}/${id}`);
}

function saveOne(purchaseOrder: PurchaseOrder): PurchaseOrder {
  _setAuditData(purchaseOrder);
  const url = `${FIREBASE.PATH.PURCHASE_ORDER.BASE}/${purchaseOrder.id}`;
  if (!exists(purchaseOrder.id)) return database.setData(url, purchaseOrder);

  console.error(alreadyExistMessage(purchaseOrder.id));
  return null;
}

function saveAll(purchaseOrders: PurchaseOrder[]): PurchaseOrderCollection {
  if (!purchaseOrders.length) return null;

  const data = purchaseOrders.reduce(_auditingEach, {});

  return database.updateData(FIREBASE.PATH.PURCHASE_ORDER.BASE, data);
}

function updateOne(purchaseOrder: PurchaseOrder): PurchaseOrder {
  _setAuditData(purchaseOrder, true);
  const url = `${FIREBASE.PATH.PURCHASE_ORDER.BASE}/${purchaseOrder.id}`;

  if (exists(purchaseOrder.id)) return database.updateData(url, purchaseOrder);

  console.error(doNotExistMessage(purchaseOrder.id));
  return null;
}

function updateAll(purchaseOrders: PurchaseOrder[]): PurchaseOrderCollection {
  if (!purchaseOrders.length) return null;

  const data = purchaseOrders.reduce(_auditingEach, {});

  return database.updateData(FIREBASE.PATH.PURCHASE_ORDER.BASE, data);
}

function removeOne(id: string): boolean {
  const url = `${FIREBASE.PATH.PURCHASE_ORDER.BASE}/${id}`;

  if (exists(id)) {
    database.removeData(url);
    return true;
  }

  console.error(doNotExistMessage(id));
  return false;
}

function removeAll(ids: string[]): boolean {
  if (!ids.length) return false;

  const data = ids.reduce(
    (acc, id) => ({...acc, [id]: null}),
    {} as PurchaseOrderCollection
  );

  try {
    database.updateData(FIREBASE.PATH.PURCHASE_ORDER.BASE, data);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

function exists(id: string) {
  const url = `${FIREBASE.PATH.PURCHASE_ORDER.BASE}/${id}`;
  return !!database.getData(url, {shallow: true})?.id;
}

function _updateAudit(auditWithId: AuditWithId) {
  const url = `${FIREBASE.PATH.PURCHASE_ORDER.BASE}/${auditWithId.id}/${FIREBASE.PATH.PURCHASE_ORDER.AUDIT}`;
  delete auditWithId.id;
  database.updateData(url, auditWithId);
}

const _purchaseOrderRepository = {
  getAll,
  getOne,
  saveOne,
  saveAll,
  updateOne,
  updateAll,
  removeOne,
  removeAll,
  exists,
};

export {_purchaseOrderRepository};
