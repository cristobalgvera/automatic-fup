import {_purchaseOrderRepository} from '../db/purchase-order.repository';
import {PO_STATUS, PurchaseOrder} from '../util/schema/purchase-order.schema';

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
    case PO_STATUS.NOT_SHIPPED_YET:
    case PO_STATUS.TO_BE_QUOTED:
    case PO_STATUS.UNDER_REPAIR_PROCESS:
      return evaluateEsd(purchaseOrder);
    case PO_STATUS.AWAITING_CIA_PAYMENT:
    case PO_STATUS.AWAITING_ISSUED_BUYER:
    case PO_STATUS.AWAITING_QUOTE_APPROVAL:
    case PO_STATUS.CANCELLED:
    case PO_STATUS.CORE_RETURN:
    case PO_STATUS.SCRAPPED:
    case PO_STATUS.SHIPPED:
      return true;
    case PO_STATUS.NOT_RECEIVED:
    default:
      return false;
  }
}

function evaluateEsd(purchaseOrder: PurchaseOrder) {
  return purchaseOrder.esd ? new Date(purchaseOrder.esd) >= new Date() : false;
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
