import { createCrud } from './client';

export const productionApi = {
  preliminaryBoqs: createCrud('/production/preliminary-boqs'),
  mfgBoqs: createCrud('/production/mfg-boqs'),
  mfgDrawings: createCrud('/production/mfg-drawings'),
  manufacturingOrders: createCrud('/production/manufacturing-orders'),
  materialRequisitions: createCrud('/production/material-requisitions'),
  qcReports: createCrud('/production/qc-reports'),
  timelines: createCrud('/production/timelines'),
  packaging: createCrud('/production/packaging'),
};