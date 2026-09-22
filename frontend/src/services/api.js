import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Interceptor to add Bearer token to headers
api.interceptors.request.use(
  (config) => {
    try {
      if (config.url && (config.url.startsWith('/admin') || config.url.startsWith('/moderation'))) {
        const adminItem = localStorage.getItem('Orbit_admin');
        if (adminItem && adminItem !== 'undefined') {
          const admin = JSON.parse(adminItem);
          if (admin && admin.token) {
            config.headers.Authorization = `Bearer ${admin.token}`;
          }
        }
      } else {
        const userItem = localStorage.getItem('chat_user');
        if (userItem && userItem !== 'undefined') {
          const user = JSON.parse(userItem);
          if (user && user.token) {
            config.headers.Authorization = `Bearer ${user.token}`;
          }
        }
      }
    } catch (e) {
      console.error('Error parsing token from localStorage', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAuthRoute = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
      if (!isAuthRoute) {
        if (error.config?.url?.startsWith('/admin') || error.config?.url?.startsWith('/moderation')) {
          localStorage.removeItem('Orbit_admin');
        } else {
          localStorage.removeItem('chat_user');
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
