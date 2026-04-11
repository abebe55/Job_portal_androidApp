import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const adminLogin = (data: object) => api.post('/token/', data);

// Jobs
export const adminGetJobs = (params?: object) => api.get('/jobs/admin/all/', { params });
export const adminApproveJob = (id: number, data: object) => api.patch(`/jobs/admin/${id}/review/`, data);
export const adminDeleteJob = (id: number) => api.delete(`/jobs/admin/${id}/delete/`);
export const adminBulkDeleteJobs = (ids: number[]) => api.post('/jobs/admin/bulk-delete/', { ids });
export const adminGetExpiredJobs = () => api.get('/jobs/admin/expired/');
export const adminAutoCloseExpired = () => api.post('/jobs/admin/auto-close/');
export const adminReviewExtend = (id: number, data: object) => api.patch(`/jobs/admin/${id}/review-extend/`, data);

// Users
export const adminGetUsers = (params?: object) => api.get('/auth/admin/users/', { params });
export const adminUpdateUser = (id: number, data: object) => api.patch(`/auth/admin/users/${id}/`, data);
export const adminDeleteUser = (id: number) => api.delete(`/auth/admin/users/${id}/`);

// Employer verifications
export const adminGetEmployerVerifications = (params?: object) => api.get('/auth/admin/employer-verifications/', { params });
export const adminGetEmployerVerification  = (user_id: number) => api.get(`/auth/admin/employer-verifications/${user_id}/`);
export const adminReviewEmployerVerification = (user_id: number, data: object) => api.patch(`/auth/admin/employer-verifications/${user_id}/`, data);

// Wallet / Commission
export const adminGetCommission = () => api.get('/wallet/admin/commission/');
export const adminUpdateCommission = (data: object) => api.patch('/wallet/admin/commission/', data);
export const adminGetTransactions = () => api.get('/wallet/admin/transactions/');
export const adminGetWallets = () => api.get('/wallet/admin/wallets/');

export default api;
