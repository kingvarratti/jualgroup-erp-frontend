import { createCrud } from './client';

export const financeApi = {
  invoices: createCrud('/finance/invoices'),
  payments: createCrud('/finance/payments'),
  paymentVouchers: createCrud('/finance/payment-vouchers'),
  pvFilings: createCrud('/finance/pv-filings'),
  generalLedger: createCrud('/finance/general-ledger'),
  soa: createCrud('/finance/soa'),
  soaSubmissions: createCrud('/finance/soa-submissions'),
  dispatches: createCrud('/finance/dispatches'),
};