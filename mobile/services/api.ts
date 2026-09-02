import axios, { AxiosResponse } from 'axios';
import { getItem } from '../utils/storage';
import { Platform } from 'react-native';

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
 * Retry wrapper — safe ONLY for idempotent/read operations (GET, profile, job list, etc.)
 * DO NOT use for write operations that can create duplicate records.
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
      // Only retry on 5xx server errors — never on 4xx client errors
      if (!status || status < 500) throw err;
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

// ── Auth — NO retry on write operations (register, login, OTP send) ──────────
// These are non-idempotent: retrying creates duplicate users / duplicate OTPs.
// The backend now handles its own DB retry internally.

export const register = (data: object) =>
  api.post('/auth/register/', data);

export const registerMultipart = (data: FormData) =>
  api.post('/auth/register/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const login = (data: object) =>
  api.post('/token/', data);

export const sendVerificationOTP = (email: string) =>
  api.post('/auth/send-otp/', { email });

export const verifyEmailOTP = (email: string, otp: string) =>
  api.post('/auth/verify-otp/', { email, otp });

export const requestPasswordReset = (email: string) =>
  api.post('/auth/password-reset/request/', { email });

export const confirmPasswordReset = (data: object) =>
  api.post('/auth/password-reset/confirm/', data);

// ── Profile — retry safe (GET / PATCH profile) ────────────────────────────────
export const getProfile = () =>
  withRetry(() => api.get('/auth/profile/'));

export const updateProfile = (data: object) =>
  api.patch('/auth/profile/', data);  // no retry — PATCH is not idempotent here

// ── Jobs — GET safe to retry, POST/PATCH/DELETE are not ──────────────────────
export const getJobs = (params?: object) =>
  withRetry(() => api.get('/jobs/', { params }));

export const getJobDetail = (id: number) =>
  withRetry(() => api.get(`/jobs/${id}/`));

export const createJob = (data: object) =>
  api.post('/jobs/create/', data);

export const updateJob = (id: number, data: object) =>
  api.patch(`/jobs/${id}/edit/`, data);

export const deleteJob = (id: number) =>
  api.delete(`/jobs/${id}/delete/`);

export const getMyJobs = () =>
  withRetry(() => api.get('/jobs/my-jobs/'));

export const payJobFee = (id: number, data: object) =>
  api.post(`/jobs/${id}/pay-fee/`, data);

export const confirmJobPayment = (id: number, data: object) =>
  api.post(`/jobs/${id}/confirm-payment/`, data);

export const requestDeadlineExtend = (id: number, data: object) =>
  api.post(`/jobs/${id}/request-extend/`, data);

export const payExtendFee = (id: number, data: object) =>
  api.post(`/jobs/${id}/pay-extend/`, data);

export const confirmExtendPayment = (id: number, data: object) =>
  api.post(`/jobs/${id}/confirm-extend/`, data);

// ── Applications — apply is non-idempotent, reads are safe ───────────────────
export const applyJob = (data: object) =>
  api.post('/applications/apply/', data);

export const getMyApplications = () =>
  withRetry(() => api.get('/applications/my/'));

export const getJobApplications = (jobId: number) =>
  withRetry(() => api.get(`/applications/job/${jobId}/`));

export const updateApplicationStatus = (id: number, data: object) =>
  api.patch(`/applications/${id}/status/`, data);

// ── CV ────────────────────────────────────────────────────────────────────────
export const getCV = () =>
  withRetry(() => api.get('/cvs/'));

export const updateCV = (data: FormData) =>
  api.patch('/cvs/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// ── Wallet ────────────────────────────────────────────────────────────────────
export const getWallet = () =>
  withRetry(() => api.get('/wallet/'));

export const initiateDeposit = (data: object) =>
  api.post('/wallet/deposit/', data);

export const verifyChapa = (txRef: string) =>
  withRetry(() => api.get(`/wallet/chapa/verify/?tx_ref=${txRef}`));

export const deductCommission = () =>
  api.post('/wallet/deduct/');

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminGetJobs = (params?: object) =>
  withRetry(() => api.get('/jobs/admin/all/', { params }));

export const adminApproveJob = (id: number, data: object) =>
  api.patch(`/jobs/admin/${id}/approve/`, data);

export const adminGetUsers = (params?: object) =>
  withRetry(() => api.get('/auth/admin/users/', { params }));

export const adminUpdateUser = (id: number, data: object) =>
  api.patch(`/auth/admin/users/${id}/`, data);

export const adminGetCommission = () =>
  withRetry(() => api.get('/wallet/admin/commission/'));

export const adminUpdateCommission = (data: object) =>
  api.patch('/wallet/admin/commission/', data);

export const adminGetTransactions = () =>
  withRetry(() => api.get('/wallet/admin/transactions/'));

export default api;
