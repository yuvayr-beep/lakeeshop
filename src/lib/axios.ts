import axios from 'axios';

// Backend integration point: Replace baseURL with environment variable
const axiosInstance = axios?.create({
  baseURL: '/api/proxy',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

axiosInstance?.interceptors?.request?.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance?.interceptors?.response?.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;