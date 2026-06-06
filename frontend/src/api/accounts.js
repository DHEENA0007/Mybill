import api from './axios';

// Dashboard
export const getAccountsDashboard = () => api.get('/accounts-dashboard/');

// Income Types
export const getIncomeTypes = () => api.get('/income-types/');
export const createIncomeType = (data) => api.post('/income-types/', data);
export const updateIncomeType = (id, data) => api.put(`/income-types/${id}/`, data);
export const deleteIncomeType = (id) => api.delete(`/income-types/${id}/`);

// Incomes
export const getIncomes = (params) => api.get('/incomes/', { params });
export const createIncome = (data) => api.post('/incomes/', data);
export const updateIncome = (id, data) => api.put(`/incomes/${id}/`, data);
export const deleteIncome = (id) => api.delete(`/incomes/${id}/`);

// Expense Categories
export const getExpenseCategories = () => api.get('/accounts-expense-categories/');
export const createExpenseCategory = (data) => api.post('/accounts-expense-categories/', data);
export const updateExpenseCategory = (id, data) => api.put(`/accounts-expense-categories/${id}/`, data);
export const deleteExpenseCategory = (id) => api.delete(`/accounts-expense-categories/${id}/`);

// Expense Subcategories
export const getExpenseSubcategories = (params) => api.get('/accounts-expense-subcategories/', { params });
export const createExpenseSubcategory = (data) => api.post('/accounts-expense-subcategories/', data);
export const updateExpenseSubcategory = (id, data) => api.put(`/accounts-expense-subcategories/${id}/`, data);
export const deleteExpenseSubcategory = (id) => api.delete(`/accounts-expense-subcategories/${id}/`);

// Expenses
export const getExpenses = (params) => api.get('/accounts-expenses/', { params });
export const createExpense = (data) => api.post('/accounts-expenses/', data);
export const updateExpense = (id, data) => api.put(`/accounts-expenses/${id}/`, data);
export const deleteExpense = (id) => api.delete(`/accounts-expenses/${id}/`);
