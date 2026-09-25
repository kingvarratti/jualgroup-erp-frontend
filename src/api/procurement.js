import { api, createCrud } from './client';

export const procurementApi = {
  inventory: {
    ...createCrud('/procurement/inventory'),
    reports: () => api.get('/procurement/inventory/reports/').then((r) => r.data),
    stats: () => api.get('/procurement/inventory/stats/').then((r) => r.data),
  },
  stockRequisitions: createCrud('/procurement/stock-requisitions'),
  suppliers: createCrud('/procurement/suppliers'),
  rfqs: createCrud('/procurement/rfqs'),
  supplierQuotes: createCrud('/procurement/supplier-quotes'),
  purchaseOrders: createCrud('/procurement/purchase-orders'),
  grns: createCrud('/procurement/grns'),
  supplierPayments: createCrud('/procurement/supplier-payments'),
  movements: createCrud('/procurement/warehouse-movements'),
};