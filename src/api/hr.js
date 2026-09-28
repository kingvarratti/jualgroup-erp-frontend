import { api, createCrud } from './client';

export const hrApi = {
  leaveTypes: createCrud('/hr/leave-types'),
  leaveBalances: {
    ...createCrud('/hr/leave-balances'),
    mySummary: (year) =>
      api.get(`/hr/leave-balances/my_summary/?year=${year || ''}`).then((r) => r.data),
  },
  leaveApplications: {
    ...createCrud('/hr/leave-applications'),
    pendingForMe: () =>
      api.get('/hr/leave-applications/pending_for_me/').then((r) => r.data),
  },
  performanceCycles: createCrud('/hr/performance-cycles'),
  kpis: createCrud('/hr/kpis'),
  appraisals: createCrud('/hr/appraisals'),
  payrollCycles: {
    ...createCrud('/hr/payroll-cycles'),
    stats: () => api.get('/hr/payroll-cycles/stats/').then((r) => r.data),
    bankTransferCsv: async (id, filename) => {
      const res = await api.get(`/hr/payroll-cycles/${id}/bank_transfer_csv/`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename || `bank-transfers-${id}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
  },
  payslips: createCrud('/hr/payslips'),
  exitProcesses: createCrud('/hr/exit-processes'),
};