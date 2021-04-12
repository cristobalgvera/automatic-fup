import {PurchaseOrderRepository} from '../db/purchase-order.repository';
import {PurchaseOrder} from '../util/interface/db/purchase-order.interface';

export {PurchaseOrderRepository as PurchaseOrderService} from '../db/purchase-order.repository';

function test() {
  const purchaseOrder = <PurchaseOrder>{
    vendorName: 'TEST VENDOR',
    purchaseOrder: 'PO123873',
    partNumber: '38269927',
  };

  const a = {...purchaseOrder, ...{purchaseOrder: 'PO987654', line: 90}};

  const e = PurchaseOrderRepository.saveAll([purchaseOrder, a]);
  console.log(JSON.stringify(e));
}
