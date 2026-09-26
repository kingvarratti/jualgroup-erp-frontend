import { api, createCrud } from './client';

export const procurementApi = {
  inventory: {
    ...createCrud('/procurement/inventory'),
    reports: () => api.get('/procurement/inventory/reports/').then((r) => r.data),
    stats: () => api.get('/procurement/inventory/stats/').then((r) => r.data),
    template: () =>
      api
        .get('/procurement/inventory/template/', { responseType: 'blob' })
        .then((r) => {
          const url = window.URL.createObjectURL(new Blob([r.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', 'inventory_import_template.csv');
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
        }),
    bulkImport: (formData) =>
      api
        .post('/procurement/inventory/bulk_import/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data),
  },
  stockRequisitions: createCrud('/procurement/stock-requisitions'),
  suppliers: createCrud('/procurement/suppliers'),
  rfqs: createCrud('/procurement/rfqs'),
  supplierQuotes: createCrud('/procurement/supplier-quotes'),
  purchaseOrders: createCrud('/procurement/purchase-orders'),
  grns: createCrud('/procurement/grns'),
  supplierPayments: createCrud('/procurement/supplier-payments'),
  movements: createCrud('/procurement/warehouse-movements'),
  branchStocks: createCrud('/procurement/branch-stocks'),
};