import api from './axios';

export const getTemplates = () => api.get('/invoice-templates/');
export const getTemplate = (id) => api.get(`/invoice-templates/${id}/`);
export const getDefaultTemplate = (type = 'nontax') => api.get(`/invoice-templates/default/?type=${type}`);
export const createTemplate = (data) => api.post('/invoice-templates/', data);
export const updateTemplate = (id, data) => api.patch(`/invoice-templates/${id}/`, data);
export const deleteTemplate = (id) => api.delete(`/invoice-templates/${id}/`);
export const setDefaultTemplate = (id) => api.post(`/invoice-templates/${id}/set_default/`);
export const uploadLogo = (id, file) => {
  const form = new FormData();
  form.append('logo', file);
  return api.post(`/invoice-templates/${id}/upload_logo/`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
