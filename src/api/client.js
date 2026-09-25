import axios from 'axios';
import { API_URL } from '../utils/constants';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: refresh token on 401
let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }
      if (!refreshing) {
        refreshing = axios
          .post(`${API_URL}/core/auth/refresh/`, { refresh: refreshToken })
          .then((r) => {
            localStorage.setItem('access_token', r.data.access);
            return r.data.access;
          })
          .catch(() => {
            localStorage.clear();
            window.location.href = '/login';
          })
          .finally(() => {
            refreshing = null;
          });
      }
      const newToken = await refreshing;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

// Generic CRUD factory
export const createCrud = (endpoint) => ({
  list: (params) => api.get(`${endpoint}/`, { params }).then((r) => r.data),
  get: (id) => api.get(`${endpoint}/${id}/`).then((r) => r.data),
  create: (data) => {
    const isFormData = data instanceof FormData;
    return api
      .post(`${endpoint}/`, data, {
        headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
      })
      .then((r) => r.data);
  },
    update: (id, data) => {
    const isFormData = data instanceof FormData;
    return api
      .patch(`${endpoint}/${id}/`, data, {
        headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
      })
      .then((r) => r.data);
  },
});