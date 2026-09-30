import { api, createCrud } from './client';

export const procurementApi = {

    cannibalizations: {
    ...createCrud('/procurement/cannibalizations'),
    stats: () => api.get('/procurement/cannibalizations/stats/').then((r) => r.data),
  },

    internalMovements: {
    ...createCrud('/procurement/internal-movements'),
    stats: () => api.get('/procurement/internal-movements/stats/').then((r) => r.data),
  },


    transfers: {
    ...createCrud('/procurement/transfers'),
    stats: () => api.get('/procurement/transfers/stats/').then((r) => r.data),
    availability: (id) =>
      api.get(`/procurement/transfers/${id}/availability/`).then((r) => r.data),
  },

    categories: {
    ...createCrud('/procurement/categories'),
    tree: () => api.get('/procurement/categories/tree/').then((r) => r.data),
    flat: () => api.get('/procurement/categories/flat/').then((r) => r.data),
  },
  aliases: createCrud('/procurement/aliases'),
  supplierItems: createCrud('/procurement/supplier-items'),
  stockMovements: {
    ...createCrud('/procurement/stock-movements'),
    summary: () => api.get('/procurement/stock-movements/summary/').then((r) => r.data),
  },

  requisitions: {
    ...createCrud('/procurement/requisitions'),
    stats: () => api.get('/procurement/requisitions/stats/').then((r) => r.data),
  },
  
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