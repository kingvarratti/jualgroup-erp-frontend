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
  payrollCycles: createCrud('/hr/payroll-cycles'),
  payslips: createCrud('/hr/payslips'),
  exitProcesses: createCrud('/hr/exit-processes'),
};