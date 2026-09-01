import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { getItem } from '../utils/storage';
import { Platform } from 'react-native';

// Use environment variable for deployed backend, fallback to localhost for dev
const DEPLOYED_API = process.env.EXPO_PUBLIC_API_URL;

const BASE_URL = DEPLOYED_API
  ? DEPLOYED_API
  : Platform.OS === 'android'
    ? 'http://10.0.2.2:8000/api'
    : 'http://127.0.0.1:8000/api';

const api = axios.create({ baseURL: BASE_URL, timeout: 30000 });

api.interceptors.request.use(async (config) => {
  const token = await getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Retry wrapper — on a 500 from a cold Render instance, wait 1.5s and try once more.
 * All other errors (400, 401, 403, 404) are passed through immediately.
 */
async function withRetry<T = any>(
  fn: () => Promise<AxiosResponse<T>>,
  retries = 2,
  delayMs = 1500,
): Promise<AxiosResponse<T>> {
  let lastError: any;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const status = err?.response?.status;
      // Only retry on 500/502/503/504 (server errors) — never on 4xx
      if (!status || status < 500) throw err;
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

// Auth
export const register = (data: object) =>
  withRetry(() => api.post('/auth/register/', data));

export const registerMultipart = (data: FormData) =>
  withRetry(() => api.post('/auth/register/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }));

export const login = (data: object) =>
  withRetry(() => api.post('/token/', data));

export const getProfile = () =>
  withRetry(() => api.get('/auth/profile/'));

export const sendVerificationOTP = () =>
  withRetry(() => api.post('/auth/send-otp/'));

export const verifyEmailOTP = (otp: string) =>
  withRetry(() => api.post('/auth/verify-otp/', { otp }));

export const requestPasswordReset = (email: string) =>
  withRetry(() => api.post('/auth/password-reset/request/', { email }));

export const confirmPasswordReset = (data: object) =>
  withRetry(() => api.post('/auth/password-reset/confirm/', data));

export const updateProfile = (data: object) =>
  withRetry(() => api.patch('/auth/profile/', data));

// Jobs
export const getJobs = (params?: object) =>
  withRetry(() => api.get('/jobs/', { params }));

export const getJobDetail = (id: number) =>
  withRetry(() => api.get(`/jobs/${id}/`));

export const createJob = (data: object) =>
  withRetry(() => api.post('/jobs/create/', data));

export const updateJob = (id: number, data: object) =>
  withRetry(() => api.patch(`/jobs/${id}/edit/`, data));

export const deleteJob = (id: number) =>
  withRetry(() => api.delete(`/jobs/${id}/delete/`));

export const getMyJobs = () =>
  withRetry(() => api.get('/jobs/my-jobs/'));

export const payJobFee = (id: number, data: object) =>
  withRetry(() => api.post(`/jobs/${id}/pay-fee/`, data));

export const confirmJobPayment = (id: number, data: object) =>
  withRetry(() => api.post(`/jobs/${id}/confirm-payment/`, data));

export const requestDeadlineExtend = (id: number, data: object) =>
  withRetry(() => api.post(`/jobs/${id}/request-extend/`, data));

export const payExtendFee = (id: number, data: object) =>
  withRetry(() => api.post(`/jobs/${id}/pay-extend/`, data));

export const confirmExtendPayment = (id: number, data: object) =>
  withRetry(() => api.post(`/jobs/${id}/confirm-extend/`, data));

// Applications
export const applyJob = (data: object) =>
  withRetry(() => api.post('/applications/apply/', data));

export const getMyApplications = () =>
  withRetry(() => api.get('/applications/my/'));

export const getJobApplications = (jobId: number) =>
  withRetry(() => api.get(`/applications/job/${jobId}/`));

export const updateApplicationStatus = (id: number, data: object) =>
  withRetry(() => api.patch(`/applications/${id}/status/`, data));

// CV
export const getCV = () =>
  withRetry(() => api.get('/cvs/'));

export const updateCV = (data: FormData) =>
  withRetry(() => api.patch('/cvs/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }));

// Wallet
export const getWallet = () =>
  withRetry(() => api.get('/wallet/'));

export const initiateDeposit = (data: object) =>
  withRetry(() => api.post('/wallet/deposit/', data));

export const verifyChapa = (txRef: string) =>
  withRetry(() => api.get(`/wallet/chapa/verify/?tx_ref=${txRef}`));

export const deductCommission = () =>
  withRetry(() => api.post('/wallet/deduct/'));

// Admin
export const adminGetJobs = (params?: object) =>
  withRetry(() => api.get('/jobs/admin/all/', { params }));

export const adminApproveJob = (id: number, data: object) =>
  withRetry(() => api.patch(`/jobs/admin/${id}/approve/`, data));

export const adminGetUsers = (params?: object) =>
  withRetry(() => api.get('/auth/admin/users/', { params }));

export const adminUpdateUser = (id: number, data: object) =>
  withRetry(() => api.patch(`/auth/admin/users/${id}/`, data));

export const adminGetCommission = () =>
  withRetry(() => api.get('/wallet/admin/commission/'));

export const adminUpdateCommission = (data: object) =>
  withRetry(() => api.patch('/wallet/admin/commission/', data));

export const adminGetTransactions = () =>
  withRetry(() => api.get('/wallet/admin/transactions/'));

export default api;
