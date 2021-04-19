import {database} from '.';
import {FIREBASE} from '../config';
import {
  _auditingEach,
  _convertProperties,
  _setAuditData,
} from '../util/db/purchase-order.utility';
import {PurchaseOrderCollection} from '../util/schema/purchase-order-collection.schema';
import {PurchaseOrder} from '../util/schema/purchase-order.schema';

const alreadyExistMessage = (id: string) => `ID: ${id} already exists`;
const doNotExistMessage = (id: string) => `ID: ${id} don't exists`;

function getOne(id: string): PurchaseOrder {
  const purchaseOrder: PurchaseOrder = database.getData(
    `${FIREBASE.PATH.PURCHASE_ORDER.BASE}/${id}`
  );
  return purchaseOrder ? _convertProperties(purchaseOrder) : null;
}

function getAll(query?: OptQueryParameters): PurchaseOrder[] {
  const purchaseOrders: PurchaseOrderCollection = database.getData(
    FIREBASE.PATH.PURCHASE_ORDER.BASE,
    query
  );
  return purchaseOrders
    ? Object.values(purchaseOrders).map(_convertProperties)
    : null;
}

function saveOne(purchaseOrder: PurchaseOrder): PurchaseOrder {
  _setAuditData(purchaseOrder);
  const url = `${FIREBASE.PATH.PURCHASE_ORDER.BASE}/${purchaseOrder.id}`;
  if (!exists(purchaseOrder.id))
    return database.setData(url, purchaseOrder, {shallow: true});

  console.error(alreadyExistMessage(purchaseOrder.id));
  return null;
}

function saveAll(purchaseOrders: PurchaseOrder[]): PurchaseOrderCollection {
  if (!purchaseOrders.length) return null;

  const data = purchaseOrders.reduce(_auditingEach, {});

  return database.updateData(FIREBASE.PATH.PURCHASE_ORDER.BASE, data, {
    shallow: true,
  });
}

function updateOne(purchaseOrder: PurchaseOrder): PurchaseOrder {
  _setAuditData(purchaseOrder, true);
  const url = `${FIREBASE.PATH.PURCHASE_ORDER.BASE}/${purchaseOrder.id}`;

  if (exists(purchaseOrder.id))
    return database.updateData(url, purchaseOrder, {shallow: true});

  console.error(doNotExistMessage(purchaseOrder.id));
  return null;
}

function updateAll(purchaseOrders: PurchaseOrder[]): PurchaseOrderCollection {
  if (!purchaseOrders.length) return null;

  const data = purchaseOrders.reduce(_auditingEach, {});

  return database.updateData(FIREBASE.PATH.PURCHASE_ORDER.BASE, data, {
    shallow: true,
  });
}

function updateAllBypassingAudit(
  purchaseOrders: PurchaseOrder[]
): PurchaseOrderCollection {
  if (!purchaseOrders.length) return null;
  const data = purchaseOrders.reduce(
    (acc: PurchaseOrderCollection, purchaseOrder) => ({
      ...acc,
      [purchaseOrder.id]: purchaseOrder,
    }),
    {}
  );
  return database.updateData(FIREBASE.PATH.PURCHASE_ORDER.BASE, data, {
    shallow: true,
  });
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
    database.updateData(FIREBASE.PATH.PURCHASE_ORDER.BASE, data, {
      shallow: true,
    });
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
  useCarefully: {updateAllBypassingAudit},
};

export {_purchaseOrderRepository};
