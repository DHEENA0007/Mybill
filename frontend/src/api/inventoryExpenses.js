import api from './axios';

export const getExpenseCategories = () => api.get('/inventory/expense-categories/');
export const createExpenseCategory = (data) => api.post('/inventory/expense-categories/', data);
export const updateExpenseCategory = (id, data) => api.put(`/inventory/expense-categories/${id}/`, data);
export const deleteExpenseCategory = (id) => api.delete(`/inventory/expense-categories/${id}/`);

export const getExpenseSubcategories = (params) => api.get('/inventory/expense-subcategories/', { params });
export const createExpenseSubcategory = (data) => api.post('/inventory/expense-subcategories/', data);
export const updateExpenseSubcategory = (id, data) => api.put(`/inventory/expense-subcategories/${id}/`, data);
export const deleteExpenseSubcategory = (id) => api.delete(`/inventory/expense-subcategories/${id}/`);

export const getExpenses = (params) => api.get('/inventory/expenses/', { params });
export const createExpense = (data) => api.post('/inventory/expenses/', data);
export const updateExpense = (id, data) => api.put(`/inventory/expenses/${id}/`, data);
export const deleteExpense = (id) => api.delete(`/inventory/expenses/${id}/`);
