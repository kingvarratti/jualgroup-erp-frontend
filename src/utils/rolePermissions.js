import { ROLES } from './constants';

export const canAccess = (user, module) => {
  if (!user) return false;
  if (user.role === ROLES.ADMIN) return true;

  const permissions = {
    sales: [ROLES.SALES_ENG, ROLES.PROJ_ENG_SALES, ROLES.DESIGN_ENG_SALES],

    procurement: [
      ROLES.SUPPLY_CHAIN,
      ROLES.STORES,
      ROLES.PROJ_ENG_PROD,
      ROLES.PROD_MANAGER,
    ],
    stores: [ROLES.STORES, ROLES.SUPPLY_CHAIN],
    supply_chain: [ROLES.SUPPLY_CHAIN],

    production: [
      ROLES.PROJ_ENG_PROD,
      ROLES.DESIGN_ENG_PROD,
      ROLES.PROD_MANAGER,
      ROLES.PROD_TEAM,
      ROLES.QC,
    ],
    qc: [ROLES.QC, ROLES.PROD_MANAGER],

    accountant: [ROLES.ACCOUNTANT, ROLES.FINANCE],
    accounts: [ROLES.ACCOUNTS, ROLES.FINANCE],
    finance: [ROLES.FINANCE],

    logistics: [ROLES.LOGISTICS, ROLES.STORES, ROLES.ACCOUNTS, ROLES.FINANCE],

    hr: [ROLES.HR],
    admin: [ROLES.ADMIN],

    approvals: [
      ROLES.FINANCE,
      ROLES.ACCOUNTANT,
      ROLES.ACCOUNTS,
      ROLES.PROD_MANAGER,
      ROLES.STORES,
      ROLES.SUPPLY_CHAIN,
      ROLES.HR,
    ],
  };

  return permissions[module]?.includes(user.role) ?? false;
};