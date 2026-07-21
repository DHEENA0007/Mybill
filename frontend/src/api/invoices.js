import api from './axios';

export const getInvoices = (params) => api.get('/invoices/', { params });
export const getInvoiceSummary = (params) => api.get('/invoices/summary/', { params });
export const getInvoice = (id) => api.get(`/invoices/${id}/`);
export const createInvoice = (data) => api.post('/invoices/', data);
export const updateInvoice = (id, data) => api.put(`/invoices/${id}/`, data);
export const deleteInvoice = (id) => api.delete(`/invoices/${id}/`);
export const cancelInvoice = (id) => api.post(`/invoices/${id}/cancel/`);
export const recordInvoicePayment = (id, data) => api.post(`/invoices/${id}/record_payment/`, data);
export const getCreditLogs = (params) => api.get('/credit-logs/', { params });
export const getCreditLogSummary = (params) => api.get('/credit-logs/summary/', { params });
export const settleCreditLog = (id, data) => api.post(`/credit-logs/${id}/settle/`, data);
export const getCustomersWithCredit = () => api.get('/credit-logs/customers_with_credit/');
