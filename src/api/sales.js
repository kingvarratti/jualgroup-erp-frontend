import { createCrud } from './client';

export const salesApi = {
  enquiries: createCrud('/sales/enquiries'),
  gaDrawings: createCrud('/sales/ga-drawings'),
  quotations: createCrud('/sales/quotations'),
  clientPOs: createCrud('/sales/client-pos'),
  projectReviews: createCrud('/sales/project-reviews'),
  followUps: createCrud('/sales/follow-ups'),
  offerSubmissions: createCrud('/sales/offer-submissions'),
};