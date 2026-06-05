import api from './axios';

export const getExpenseCategories = () => api.get('/expense-categories/');
export const createExpenseCategory = (data) => api.post('/expense-categories/', data);
export const updateExpenseCategory = (id, data) => api.put(`/expense-categories/${id}/`, data);
export const deleteExpenseCategory = (id) => api.delete(`/expense-categories/${id}/`);

export const getExpenseSubcategories = (params) => api.get('/expense-subcategories/', { params });
export const createExpenseSubcategory = (data) => api.post('/expense-subcategories/', data);
export const updateExpenseSubcategory = (id, data) => api.put(`/expense-subcategories/${id}/`, data);
export const deleteExpenseSubcategory = (id) => api.delete(`/expense-subcategories/${id}/`);

export const getExpenses = (params) => api.get('/expenses/', { params });
export const createExpense = (data) => api.post('/expenses/', data);
export const updateExpense = (id, data) => api.put(`/expenses/${id}/`, data);
export const deleteExpense = (id) => api.delete(`/expenses/${id}/`);
