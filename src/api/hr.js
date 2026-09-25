import { createCrud } from './client';

export const hrApi = {
  leaveTypes: createCrud('/hr/leave-types'),
  leaveBalances: createCrud('/hr/leave-balances'),
  leaveApplications: createCrud('/hr/leave-applications'),
  performanceCycles: createCrud('/hr/performance-cycles'),
  kpis: createCrud('/hr/kpis'),
  appraisals: createCrud('/hr/appraisals'),
  payrollCycles: createCrud('/hr/payroll-cycles'),
  payslips: createCrud('/hr/payslips'),
  exitProcesses: createCrud('/hr/exit-processes'),
};