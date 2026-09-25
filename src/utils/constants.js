export const API_URL = 'http://localhost:8000/api';

export const ROLES = {
  ADMIN: 'ADMIN',
  SALES_ENG: 'SALES_ENG',
  PROJ_ENG_SALES: 'PROJ_ENG_SALES',
  DESIGN_ENG_SALES: 'DESIGN_ENG_SALES',
  PROJ_ENG_PROD: 'PROJ_ENG_PROD',
  DESIGN_ENG_PROD: 'DESIGN_ENG_PROD',
  PROD_MANAGER: 'PROD_MANAGER',
  SUPPLY_CHAIN: 'SUPPLY_CHAIN',
  STORES: 'STORES',
  LOGISTICS: 'LOGISTICS',
  PROD_TEAM: 'PROD_TEAM',
  QC: 'QC',
  FINANCE: 'FINANCE',
  HR: 'HR',
  ACCOUNTANT: 'ACCOUNTANT',
  ACCOUNTS: 'ACCOUNTS',
};

export const ROLE_LABELS = {
  ADMIN: 'Administrator',
  SALES_ENG: 'Sales Person',
  PROJ_ENG_SALES: 'Project Engineer (Sales)',
  DESIGN_ENG_SALES: 'Design Engineer (Sales)',
  PROJ_ENG_PROD: 'Project Engineer (Production)',
  DESIGN_ENG_PROD: 'Design Engineer (Production)',
  PROD_MANAGER: 'Production Manager',
  SUPPLY_CHAIN: 'Supply Chain',
  STORES: 'Store / Warehouse',
  LOGISTICS: 'Logistics',
  PROD_TEAM: 'Production Team',
  QC: 'Quality Control',
  FINANCE: 'Finance Manager',
  HR: 'Human Resources',
  ACCOUNTANT: 'Accountant',
  ACCOUNTS: 'Accounts',
};

export const STATUS_COLORS = {
  // Generic
  DRAFT: 'gray', PENDING: 'amber', APPROVED: 'green', REJECTED: 'red',
  COMPLETED: 'green', CANCELLED: 'gray', CLOSED: 'gray',
  // Sales
  RECEIVED: 'blue', UNDER_REVIEW: 'amber', QUOTING: 'indigo',
  QUOTED: 'purple', WON: 'green', LOST: 'red',
  PENDING_FINANCE: 'amber', APPROVED_FINANCE: 'green', REJECTED_FINANCE: 'red',
  SUBMITTED: 'indigo', ACCEPTED: 'green', DECLINED: 'red',
  // Procurement
  SENT: 'indigo', PARTIAL: 'amber', PARTIALLY_ISSUED: 'amber', ISSUED: 'green',
  PENDING_PROFITABILITY: 'amber',
  // Production
  DESIGN_APPROVAL: 'blue', MFG_BOQ: 'indigo', STOCK_CHECK: 'amber',
  MANUFACTURING: 'purple', TESTING: 'cyan', FINISHING: 'orange',
  QC: 'pink', AS_BUILT: 'teal', PACKAGING: 'yellow', DISPATCHED: 'green',
  // Finance
  PAID: 'green', OVERDUE: 'red',
  PREPARING: 'gray', IN_TRANSIT: 'blue', DELIVERED: 'green', RETURNED: 'red',
  // HR
  SUPERVISOR_APPROVED: 'indigo', HOD_APPROVED: 'purple', HR_APPROVED: 'green',
  INITIATED: 'gray', ACCEPTED_HR: 'indigo', CLEARANCE: 'amber', CLEARED: 'green',
  FINAL_SETTLEMENT: 'purple',
};