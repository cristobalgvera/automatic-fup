import {_purchaseOrderRepository} from '../db/purchase-order.repository';
import {PurchaseOrder} from '../util/schema/purchase-order.schema';

function exists(id: string) {
  return _purchaseOrderRepository.exists(id);
}

function getOne(id: string) {
  return _purchaseOrderRepository.getOne(id);
}

function getAll(query?: OptQueryParameters) {
  return _purchaseOrderRepository.getAll(query);
}

function saveOne(purchaseOrder: PurchaseOrder) {
  return _purchaseOrderRepository.saveOne(purchaseOrder);
}

function saveAll(purchaseOrders: PurchaseOrder[]) {
  return _purchaseOrderRepository.saveAll(purchaseOrders);
}

function updateOne(purchaseOrder: PurchaseOrder) {
  return _purchaseOrderRepository.updateOne(purchaseOrder);
}

function updateAll(purchaseOrders: PurchaseOrder[]) {
  return _purchaseOrderRepository.updateAll(purchaseOrders);
}

function removeOne(id: string) {
  return _purchaseOrderRepository.removeOne(id);
}

function removeAll(ids: string[]) {
  return _purchaseOrderRepository.removeAll(ids);
}

function validateStatus(id: string) {
  const purchaseOrder = getOne(id);
  if (!purchaseOrder?.status) return false;

  switch (purchaseOrder.status) {
    case '1. Not shipped yet':
      return purchaseOrder.esd
        ? new Date(purchaseOrder.esd) >= new Date()
        : false;
    case '2. Shipped':
      return true;
    case '3. Not received':
      return true;
    default:
      return false;
  }
}

const purchaseOrderService = {
  saveAll,
  saveOne,
  updateAll,
  updateOne,
  getOne,
  getAll,
  removeAll,
  removeOne,
  exists,
  validateStatus,
};

export {purchaseOrderService};
