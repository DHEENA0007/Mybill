import api from './axios';

export const login = (credentials) => api.post('/auth/login/', credentials);
export const logout = (refresh) => api.post('/auth/logout/', { refresh });
export const refreshToken = (refresh) => api.post('/auth/refresh/', { refresh });
export const getMe = () => api.get('/users/me/');
