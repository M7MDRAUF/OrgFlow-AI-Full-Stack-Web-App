// Centralized shared API client. Sets base URL from Vite env and attaches
// bearer token from AuthStorage on each request.
import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { authStorage } from '../features/auth/storage.js';
import { queryClient } from './query-client.js';

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

// Global 401 handler. Clearing storage alone is insufficient — cached queries
// keep serving the previous user's data until they refetch, and in-flight
// mutations may continue to send the now-invalid token. We wipe storage, the
// React Query cache (FE-C-001), and force a hard redirect to /login
// (FE-C-002). The hard redirect guarantees any React state tied to the old
// identity is torn down; SSR/cross-tab consistency is preserved.
let redirecting = false;

// Backend error envelope (matches apps/api/src/utils/response.ts).
function extractServerMessage(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null;
  const body = data as Record<string, unknown>;
  if (body['success'] !== false) return null;
  const err = body['error'];
  if (typeof err !== 'object' || err === null) return null;
  const errObj = err as Record<string, unknown>;
  const msg = errObj['message'];
  if (typeof msg !== 'string' || msg.length === 0) return null;
  // If validation, append the first issue path/message so the form can show why.
  const details = errObj['details'];
  if (Array.isArray(details) && details.length > 0) {
    const first = details[0] as { path?: unknown; message?: unknown };
    if (typeof first.message === 'string' && first.message.length > 0) {
      const path = typeof first.path === 'string' && first.path.length > 0 ? `${first.path}: ` : '';
      return `${msg} (${path}${first.message})`;
    }
  }
  return msg;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Replace the generic "Request failed with status code 400" with the
    // backend's own message (and first validation issue if present) so the UI
    // can render something the user can act on. We mutate the existing
    // AxiosError to keep TanStack Query's error handling intact.
    const serverMsg = extractServerMessage(error.response?.data);
    if (serverMsg !== null) {
      error.message = serverMsg;
    }
    if (error.response?.status === 401) {
      authStorage.clear();
      queryClient.clear();
      if (typeof window !== 'undefined' && !redirecting) {
        const currentPath = window.location.pathname + window.location.search;
        const onLogin =
          window.location.pathname === '/login' || window.location.pathname === '/activate';
        if (!onLogin) {
          redirecting = true;
          const target = `/login?from=${encodeURIComponent(currentPath)}`;
          window.location.assign(target);
          // Reset flag after navigation in case the redirect is intercepted (e.g. tests)
          setTimeout(() => {
            redirecting = false;
          }, 2000);
        }
      }
    }
    return Promise.reject(error);
  },
);
