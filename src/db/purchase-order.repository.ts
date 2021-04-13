import {database} from '.';
import {FIREBASE} from '../config/firebase.config';
import {generatePurchaseOrderId} from '../service/utility.service';
import {PurchaseOrderCollection} from '../util/schema/purchase-order-collection.schema';
import {PurchaseOrder} from '../util/schema/purchase-order.schema';

const alreadyExistMessage = (id: string) => `ID: ${id} already exists`;
const doNotExistMessage = (id: string) => `ID: ${id} don't exists`;

function getAll(query?: OptQueryParameters): PurchaseOrder[] {
  return database.getData(FIREBASE.PATH.PURCHASE_ORDER, query);
}

function getOne(id: string): PurchaseOrder {
  return database.getData(`${FIREBASE.PATH.PURCHASE_ORDER}/${id}`);
}

function saveOne(purchaseOrder: PurchaseOrder): PurchaseOrder {
  purchaseOrder.id ??= generatePurchaseOrderId(purchaseOrder);
  purchaseOrder.creationDate = new Date();
  const url = `${FIREBASE.PATH.PURCHASE_ORDER}/${purchaseOrder.id}`;
  const exists = !!database.getData(url, {shallow: 'true'});
  if (!exists) return database.setData(url, purchaseOrder);

  console.error(alreadyExistMessage(purchaseOrder.id));
  return null;
}

function saveAll(purchaseOrders: PurchaseOrder[]): PurchaseOrderCollection {
  if (!purchaseOrders.length) return null;

  const data = purchaseOrders.reduce((acc, purchaseOrder) => {
    purchaseOrder.id ??= generatePurchaseOrderId(purchaseOrder);
    purchaseOrder.creationDate = new Date();
    return {...acc, [purchaseOrder.id]: {...purchaseOrder}};
  }, {} as PurchaseOrderCollection);

  return database.updateData(FIREBASE.PATH.PURCHASE_ORDER, data);
}

function updateOne(purchaseOrder: PurchaseOrder): PurchaseOrder {
  purchaseOrder.id ??= generatePurchaseOrderId(purchaseOrder);
  purchaseOrder.updateDate = new Date();
  const url = `${FIREBASE.PATH.PURCHASE_ORDER}/${purchaseOrder.id}`;
  const exists = !!database.getData(url, {shallow: 'true'});

  if (exists) return database.updateData(url, purchaseOrder);

  console.error(doNotExistMessage(purchaseOrder.id));
  return null;
}

function updateAll(purchaseOrders: PurchaseOrder[]): PurchaseOrderCollection {
  if (!purchaseOrders.length) return null;

  const data = purchaseOrders.reduce((acc, purchaseOrder) => {
    purchaseOrder.id ??= generatePurchaseOrderId(purchaseOrder);
    purchaseOrder.updateDate = new Date();
    return {...acc, [purchaseOrder.id]: {...purchaseOrder}};
  }, {} as PurchaseOrderCollection);

  return database.updateData(FIREBASE.PATH.PURCHASE_ORDER, data);
}

function removeOne(id: string): boolean {
  const url = `${FIREBASE.PATH.PURCHASE_ORDER}/${id}`;
  const exists = !!database.getData(url, {shallow: 'true'});
  if (exists) {
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
    database.updateData(FIREBASE.PATH.PURCHASE_ORDER, data);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
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
};

export {_purchaseOrderRepository};
