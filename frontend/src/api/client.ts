import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  // Generous 30s timeout
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---------------------------------------------------------------------------
// In-Memory Safe Caching Layer (Strictly Non-Recursive)
// ---------------------------------------------------------------------------
interface CacheEntry {
  data: any;
  status: number;
  statusText: string;
  headers: any;
  timestamp: number;
}

const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5000; // 5 seconds memory cache for safe read queries

export const clearApiCache = (): void => {
  responseCache.clear();
};

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const method = config.method?.toLowerCase() || 'get';

  // Any mutation (POST, PUT, PATCH, DELETE) invalidates the read cache immediately
  if (method !== 'get') {
    clearApiCache();
  }

  // Attach JWT Bearer token if present
  const token = localStorage.getItem('hospitalcare_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Handle FormData: remove Content-Type header so Axios/browser automatically sets
  // multipart/form-data with the correct boundary parameter
  if (config.data instanceof FormData) {
    if (config.headers) {
      delete config.headers['Content-Type'];
      delete (config.headers as any)['content-type'];
    }
  }

  // Safe read cache: Return resolved promise adapter if fresh cached data exists
  if (method === 'get' && !(config as any).skipCache) {
    const tokenKey = token || 'anon';
    const paramStr = config.params ? JSON.stringify(config.params) : '';
    const cacheKey = `${tokenKey}:${config.url}:${paramStr}`;

    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      config.adapter = () =>
        Promise.resolve({
          data: cached.data,
          status: cached.status,
          statusText: cached.statusText,
          headers: cached.headers,
          config,
          request: {},
        });
    }
  }

  return config;
});

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const method = response.config.method?.toLowerCase() || 'get';

    // Cache successful GET responses
    if (method === 'get' && !(response.config as any).skipCache && response.status >= 200 && response.status < 300) {
      const token = localStorage.getItem('hospitalcare_token') || 'anon';
      const paramStr = response.config.params ? JSON.stringify(response.config.params) : '';
      const cacheKey = `${token}:${response.config.url}:${paramStr}`;
      responseCache.set(cacheKey, {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        timestamp: Date.now(),
      });
    } else if (['post', 'put', 'patch', 'delete'].includes(method)) {
      clearApiCache();
    }

    return response;
  },
  (error) => {
    let message =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected server error occurred.';

    if (!error.response) {
      if (error.code === 'ECONNABORTED' || /timeout/i.test(String(error.message))) {
        message =
          'The HospitalCare API did not respond in time. Confirm the backend is running on the proxied port (default 5000).';
      } else if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
        message =
          'Cannot reach the HospitalCare API. Start the backend (`npm run dev --workspace=backend`) and ensure MongoDB Atlas credentials in backend/.env are valid.';
      }
    }

    // If unauthorized, clear invalid token and redirect to login (avoiding recursion if already on login)
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      clearApiCache();
      localStorage.removeItem('hospitalcare_token');
      localStorage.removeItem('hospitalcare_user');
      window.location.href = '/login';
    }

    const normalised = new Error(message) as Error & {
      code?: string;
      status?: number;
      details?: unknown;
    };
    normalised.code =
      error.response?.data?.error?.code || error.response?.data?.code || undefined;
    normalised.status = error.response?.status;
    normalised.details = error.response?.data?.error?.details;

    return Promise.reject(normalised);
  }
);
