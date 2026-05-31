import api from './axios';

// Companies
export const getCompanies = (params) => api.get('/superadmin/companies/', { params });
export const getCompany = (id) => api.get(`/superadmin/companies/${id}/`);
export const createCompany = (data) => api.post('/superadmin/companies/', data);
export const updateCompany = (id, data) => api.put(`/superadmin/companies/${id}/`, data);
export const deleteCompany = (id) => api.delete(`/superadmin/companies/${id}/`);
export const toggleCompanyActive = (id) => api.post(`/superadmin/companies/${id}/toggle_active/`);
export const getCompanyStats = () => api.get('/superadmin/companies/stats/');

// Company Admins
export const getCompanyAdmins = (params) => api.get('/superadmin/admins/', { params });
export const createCompanyAdmin = (data) => api.post('/superadmin/admins/', data);
export const updateCompanyAdmin = (id, data) => api.put(`/superadmin/admins/${id}/`, data);
export const deleteCompanyAdmin = (id) => api.delete(`/superadmin/admins/${id}/`);

// Company Setup (for company admins)
export const getCompanySetup = () => api.get('/company-setup/');
export const updateCompanySetup = (data) => api.post('/company-setup/', data);
