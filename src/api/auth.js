import { api } from './client';

export const authApi = {
  login: (username, password) =>
    api.post('/core/auth/login/', { username, password }).then((r) => r.data),
  me: () => api.get('/core/users/me/').then((r) => r.data),
};