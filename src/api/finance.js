import { api, createCrud } from './client';

export const financeApi = {
  invoices: createCrud('/finance/invoices'),
  payments: createCrud('/finance/payments'),
  paymentVouchers: createCrud('/finance/payment-vouchers'),
  pvFilings: createCrud('/finance/pv-filings'),
  generalLedger: createCrud('/finance/general-ledger'),
  soa: {
    ...createCrud('/finance/soa'),
    generate: (data) => api.post('/finance/soa/generate/', data).then((r) => r.data),
    clients: () => api.get('/finance/soa/clients/').then((r) => r.data),
    pdf: async (id, filename) => {
      const res = await api.get(`/finance/soa/${id}/pdf/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename || `SOA-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
  },
  soaSubmissions: createCrud('/finance/soa-submissions'),
  dispatches: createCrud('/finance/dispatches'),
};