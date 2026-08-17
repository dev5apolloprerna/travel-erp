import axios from 'axios';

// Use environment variable for API URL
// In development: uses proxy (/api)
// In production: uses full URL (https://apitravel360.salexo.co.in)
const baseURL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

console.log('🔗 API Base URL:', baseURL);

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      if (!location.pathname.startsWith('/login')) location.href = '/login/employee';
    }
    return Promise.reject(err);
  }
);

export default api;
