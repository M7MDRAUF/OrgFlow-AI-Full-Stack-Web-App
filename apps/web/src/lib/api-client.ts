// Centralized shared API client. Sets base URL from Vite env and attaches
// bearer token from AuthStorage on each request.
import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { authStorage } from '../features/auth/storage.js';

function resolveBaseUrl(): string {
  const raw: unknown = import.meta.env['VITE_API_BASE_URL'];
  if (typeof raw !== 'string' || raw.length === 0) {
    return 'http://localhost:4000/api/v1';
  }
  return raw;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 30_000,
  withCredentials: false,
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = authStorage.getToken();
  if (token !== null) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      authStorage.clear();
    }
    return Promise.reject(error);
  },
);
