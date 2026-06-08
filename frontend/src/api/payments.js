import api from './axios';

export const getPayments = (params) => api.get('/payments/', { params });
export const createPayment = (data) => api.post('/payments/', data);
export const getPaymentSummary = () => api.get('/payments/summary/');

// Supplier payments
export const recordSupplierPayment = (data) => api.post('/payments/record_supplier_payment/', data);
export const getSuppliersWithPending = () => api.get('/payments/suppliers_with_pending/');
export const getSupplierPurchases = (supplierId) => api.get('/payments/supplier_purchases/', { params: { supplier_id: supplierId } });

// Customer credit payments
export const recordCreditPayment = (data) => api.post('/payments/record_credit_payment/', data);
export const getCustomerCredits = (customerId) => api.get('/payments/customer_credits/', { params: { customer_id: customerId } });
