import { createCrud } from './client';

export const coreApi = {
  users: createCrud('/core/users'),
  branches: createCrud('/core/branches'),
  approvals: createCrud('/core/approvals'),
  auditLogs: createCrud('/core/audit-logs'),
};