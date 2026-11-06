import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  // Prevent indefinite "Verifying Session…" when the API/proxy is unreachable.
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('hospitalcare_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
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

    // If unauthorized, clear invalid token
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('hospitalcare_token');
      localStorage.removeItem('hospitalcare_user');
      window.location.href = '/login';
    }

    // Preserve structured details (e.g. duplicate-patient candidates) so the
    // UI can offer a resolution flow instead of a dead-end alert.
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
