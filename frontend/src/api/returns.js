import api from './axios';

export const getReturns = (params) => api.get('/returns/', { params });
export const createReturn = (data) => api.post('/returns/', data);
