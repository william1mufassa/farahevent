import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const adminApi = axios.create({ baseURL, timeout: 15000 });

adminApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('fe_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

adminApi.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const refresh = localStorage.getItem('fe_refresh_token');
      if (refresh && !error.config._retry) {
        error.config._retry = true;
        try {
          const { data } = await axios.post(`${baseURL}/admin/auth/refresh`, {
            refresh_token: refresh,
          });
          localStorage.setItem('fe_access_token', data.access_token);
          localStorage.setItem('fe_refresh_token', data.refresh_token);
          error.config.headers.Authorization = `Bearer ${data.access_token}`;
          return adminApi(error.config);
        } catch {
          localStorage.removeItem('fe_access_token');
          localStorage.removeItem('fe_refresh_token');
          localStorage.removeItem('fe_admin');
          window.location.href = '/admin/login';
        }
      } else {
        localStorage.removeItem('fe_access_token');
        localStorage.removeItem('fe_refresh_token');
        localStorage.removeItem('fe_admin');
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  },
);
