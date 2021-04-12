import {database} from '.';
import {FIREBASE} from '../config/firebase.config';
import {PurchaseOrderCollection} from '../util/interface/db/purchase-order-collection.interface';
import {PurchaseOrder} from '../util/interface/db/purchase-order.interface';

const generateId = ({purchaseOrder, line}: PurchaseOrder) =>
  `${purchaseOrder}-${line ?? 1}`;

function getAll(query?: OptQueryParameters): PurchaseOrder[] {
  return database.getData(FIREBASE.PATH.PURCHASE_ORDER, query);
}

function getOne(id: string): PurchaseOrder {
  return database.getData(`${FIREBASE.PATH.PURCHASE_ORDER}/${id}`);
}

function saveOne(purchaseOrder: PurchaseOrder): PurchaseOrder {
  purchaseOrder.id ??= generateId(purchaseOrder);
  const url = `${FIREBASE.PATH.PURCHASE_ORDER}/${purchaseOrder.id}`;
  return database.setData(url, purchaseOrder);
}

function saveAll(purchaseOrders: PurchaseOrder[]): PurchaseOrderCollection {
  const data = purchaseOrders.reduce((acc, purchaseOrder) => {
    purchaseOrder.id ??= generateId(purchaseOrder);
    acc[purchaseOrder.id] ??= {
      ...purchaseOrder,
    };
    return acc;
  }, {} as PurchaseOrderCollection);

  return database.updateData(FIREBASE.PATH.PURCHASE_ORDER, data);
}

const PurchaseOrderRepository = {getAll, getOne, saveOne, saveAll};

export {PurchaseOrderRepository};
