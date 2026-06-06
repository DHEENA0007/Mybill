import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post('/api/auth/refresh/', { refresh });
          localStorage.setItem('access_token', data.access);
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      } else {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    if (error.response?.status !== 401) {
      const errData = error.response?.data;
      let msg = 'Something went wrong';
      if (errData) {
        if (typeof errData === 'string') {
          msg = errData;
        } else if (errData.detail) {
          msg = errData.detail;
        } else if (errData.message) {
          msg = errData.message;
        } else if (typeof errData === 'object') {
          // Extract first validation error from DRF response
          const keys = Object.keys(errData);
          if (keys.length > 0) {
            const firstVal = errData[keys[0]];
            if (Array.isArray(firstVal) && firstVal.length > 0) {
              msg = typeof firstVal[0] === 'string' ? `${keys[0]}: ${firstVal[0]}` : JSON.stringify(firstVal[0]);
            } else if (typeof firstVal === 'string') {
              msg = firstVal;
            }
          }
        }
      } else if (error.message) {
        msg = error.message;
      }
      toast.error(msg);
    }
    return Promise.reject(error);
  }
);

export default api;
