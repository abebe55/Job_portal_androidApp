import axios from 'axios';
import { getItem } from '../utils/storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Use environment variable for deployed backend, fallback to localhost for dev
const DEPLOYED_API = process.env.EXPO_PUBLIC_API_URL;

const BASE_URL = DEPLOYED_API
  ? DEPLOYED_API
  : Platform.OS === 'android'
    ? 'http://10.0.2.2:8000/api'   // Android emulator → host machine
    : 'http://127.0.0.1:8000/api'; // web browser dev

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  const token = await getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const register = (data: object) => api.post('/auth/register/', data);
export const login = (data: object) => api.post('/token/', data);
export const getProfile = () => api.get('/auth/profile/');
export const sendVerificationOTP = () => api.post('/auth/send-otp/');
export const verifyEmailOTP = (otp: string) => api.post('/auth/verify-otp/', { otp });
export const requestPasswordReset = (email: string) => api.post('/auth/password-reset/request/', { email });
export const confirmPasswordReset = (data: object) => api.post('/auth/password-reset/confirm/', data);
export const updateProfile = (data: object) => api.patch('/auth/profile/', data);

// Jobs
export const getJobs = (params?: object) => api.get('/jobs/', { params });
export const getJobDetail = (id: number) => api.get(`/jobs/${id}/`);
export const createJob = (data: object) => api.post('/jobs/create/', data);
export const updateJob = (id: number, data: object) => api.patch(`/jobs/${id}/edit/`, data);
export const deleteJob = (id: number) => api.delete(`/jobs/${id}/delete/`);
export const getMyJobs = () => api.get('/jobs/my-jobs/');
export const payJobFee = (id: number, data: object) => api.post(`/jobs/${id}/pay-fee/`, data);
export const confirmJobPayment = (id: number, data: object) => api.post(`/jobs/${id}/confirm-payment/`, data);
export const requestDeadlineExtend = (id: number, data: object) => api.post(`/jobs/${id}/request-extend/`, data);
export const payExtendFee = (id: number, data: object) => api.post(`/jobs/${id}/pay-extend/`, data);
export const confirmExtendPayment = (id: number, data: object) => api.post(`/jobs/${id}/confirm-extend/`, data);

// Applications
export const applyJob = (data: object) => api.post('/applications/apply/', data);
export const getMyApplications = () => api.get('/applications/my/');
export const getJobApplications = (jobId: number) => api.get(`/applications/job/${jobId}/`);
export const updateApplicationStatus = (id: number, data: object) => api.patch(`/applications/${id}/status/`, data);

// CV
export const getCV = () => api.get('/cvs/');
export const updateCV = (data: FormData) => {
  return api.patch('/cvs/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Wallet
export const getWallet = () => api.get('/wallet/');
export const initiateDeposit = (data: object) => api.post('/wallet/deposit/', data);
export const verifyChapa = (txRef: string) => api.get(`/wallet/chapa/verify/?tx_ref=${txRef}`);
export const deductCommission = () => api.post('/wallet/deduct/');

// Admin
export const adminGetJobs = (params?: object) => api.get('/jobs/admin/all/', { params });
export const adminApproveJob = (id: number, data: object) => api.patch(`/jobs/admin/${id}/approve/`, data);
export const adminGetUsers = (params?: object) => api.get('/auth/admin/users/', { params });
export const adminUpdateUser = (id: number, data: object) => api.patch(`/auth/admin/users/${id}/`, data);
export const adminGetCommission = () => api.get('/wallet/admin/commission/');
export const adminUpdateCommission = (data: object) => api.patch('/wallet/admin/commission/', data);
export const adminGetTransactions = () => api.get('/wallet/admin/transactions/');

export default api;
