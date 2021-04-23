import {ACTION} from '../enum/action.enum';
import {PO_STATUS} from '../enum/po-status.enum';
import {RESPONSIBLE} from '../enum/responsible.enum';
import {PurchaseOrder} from '../schema/purchase-order.schema';
import {
  notFoundPurchaseOrderInFup,
  updatingPurchaseOrderInFup,
} from '../../service/message.service';
type Sheet = GoogleAppsScript.Spreadsheet.Sheet;

function _utilitiesToUpdateFupData(
  sheet: Sheet,
  rowNumberByKey: {[name: string]: number},
  firstColumnToEdit: number,
  totalColumns: number,
  isPurchase: boolean
) {
  const updateSheet = (purchaseOrder: PurchaseOrder) => {
    const {
      id,
      status,
      esd,
      shippedDate,
      qtyShipped,
      awb,
      comments,
      purchaseOrder: order,
    } = purchaseOrder;
    const rowNumber = rowNumberByKey[isPurchase ? id : order];
    if (!rowNumber) {
      console.error(notFoundPurchaseOrderInFup(purchaseOrder, isPurchase));
      const conflictive: PurchaseOrder = {...purchaseOrder};
      conflictive.audit.conflictive = true;
      return conflictive;
    }

    const [action, responsible] = _setResponsible(status, isPurchase);
    const vendorData = [
      [
        status,
        esd,
        shippedDate,
        qtyShipped,
        awb,
        comments,
        action ?? '',
        responsible ?? '',
      ],
    ];
    console.log(
      updatingPurchaseOrderInFup(rowNumber, purchaseOrder, isPurchase)
    );

    sheet
      .getRange(rowNumber, firstColumnToEdit, 1, totalColumns)
      .setValues(vendorData);

    purchaseOrder.audit.updatedInSheet = true;
    return purchaseOrder;
  };

  return {actions: {updateSheet}};
}

function _setResponsible(
  status: PO_STATUS,
  isPurchase: boolean
): [ACTION, RESPONSIBLE] {
  if (isPurchase) {
    switch (status) {
      case PO_STATUS.NOT_RECEIVED:
        return [ACTION.SEND_PO_TO_VENDOR, RESPONSIBLE.PROCUREMENT];
      case PO_STATUS.CANCELLED:
        return [ACTION.MANAGE_B_PLAN, RESPONSIBLE.PROCUREMENT];
      case PO_STATUS.NOT_SHIPPED_YET:
        return [ACTION.SEND_ON_ESD, RESPONSIBLE.VENDOR];
      case PO_STATUS.AWAITING_ISSUED_BUYER:
        return [ACTION.RESPOND_REQUESTED_ISSUE, RESPONSIBLE.PROCUREMENT];
      case PO_STATUS.AWAITING_CIA_PAYMENT:
        return [ACTION.PROCESS_CIA, RESPONSIBLE.PROCUREMENT];
      case PO_STATUS.SHIPPED:
        return [ACTION.FINISH_IMPORT, RESPONSIBLE.PROCUREMENT_LOGISTIC];
      default:
        return [undefined, undefined];
    }
  } else {
    switch (status) {
      case PO_STATUS.NOT_RECEIVED:
        return [ACTION.GET_POD, RESPONSIBLE.LOGISTIC];
      case PO_STATUS.CORE_RETURN:
        return [ACTION.CLOSE_PO, RESPONSIBLE.PROCUREMENT];
      case PO_STATUS.TO_BE_QUOTED:
        return [ACTION.SEND_QUOTE, RESPONSIBLE.VENDOR];
      case PO_STATUS.AWAITING_QUOTE_APPROVAL:
        return [ACTION.APPROVE_QUOTE, RESPONSIBLE.PROCUREMENT];
      case PO_STATUS.AWAITING_CIA_PAYMENT:
        return [ACTION.PROCESS_CIA, RESPONSIBLE.PROCUREMENT];
      case PO_STATUS.UNDER_REPAIR_PROCESS:
        return [ACTION.FINISH_REPAIRS, RESPONSIBLE.VENDOR];
      case PO_STATUS.SHIPPED:
        return [ACTION.FINISH_IMPORT, RESPONSIBLE.PROCUREMENT_LOGISTIC];
      case PO_STATUS.SCRAPPED:
        return [ACTION.CLOSE_PO, RESPONSIBLE.PROCUREMENT];
      default:
        return [undefined, undefined];
    }
  }
}

export {_utilitiesToUpdateFupData};
