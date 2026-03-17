import api from './axios';

export const getChoices = () => api.get('/choices/');
