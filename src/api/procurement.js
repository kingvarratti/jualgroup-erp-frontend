import { createCrud } from './client';

export const procurementApi = {
  inventory: createCrud('/procurement/inventory'),
  stockRequisitions: createCrud('/procurement/stock-requisitions'),
  suppliers: createCrud('/procurement/suppliers'),
  rfqs: createCrud('/procurement/rfqs'),
  supplierQuotes: createCrud('/procurement/supplier-quotes'),
  purchaseOrders: createCrud('/procurement/purchase-orders'),
  grns: createCrud('/procurement/grns'),
  supplierPayments: createCrud('/procurement/supplier-payments'),
  movements: createCrud('/procurement/warehouse-movements'),
};