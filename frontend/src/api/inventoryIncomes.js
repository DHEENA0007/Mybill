import api from './axios';

// Inventory Income Categories
export const getInventoryIncomeCategories = () => api.get('/inventory-income-categories/');
export const createInventoryIncomeCategory = (data) => api.post('/inventory-income-categories/', data);
export const updateInventoryIncomeCategory = (id, data) => api.put(`/inventory-income-categories/${id}/`, data);
export const deleteInventoryIncomeCategory = (id) => api.delete(`/inventory-income-categories/${id}/`);

// Inventory Income Subcategories
export const getInventoryIncomeSubcategories = (params) => api.get('/inventory-income-subcategories/', { params });
export const createInventoryIncomeSubcategory = (data) => api.post('/inventory-income-subcategories/', data);
export const updateInventoryIncomeSubcategory = (id, data) => api.put(`/inventory-income-subcategories/${id}/`, data);
export const deleteInventoryIncomeSubcategory = (id) => api.delete(`/inventory-income-subcategories/${id}/`);

// Inventory Incomes
export const getInventoryIncomes = (params) => api.get('/inventory-incomes/', { params });
export const createInventoryIncome = (data) => api.post('/inventory-incomes/', data);
export const updateInventoryIncome = (id, data) => api.put(`/inventory-incomes/${id}/`, data);
export const deleteInventoryIncome = (id) => api.delete(`/inventory-incomes/${id}/`);
