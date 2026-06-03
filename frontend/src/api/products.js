import api from './axios';

export const getProducts = (params) => api.get('/products/', { params });
export const getProduct = (id) => api.get(`/products/${id}/`);
export const createProduct = (data) => api.post('/products/', data);
export const updateProduct = (id, data) => api.put(`/products/${id}/`, data);
export const deleteProduct = (id) => api.delete(`/products/${id}/`);
export const getLowStock = () => api.get('/products/low_stock_alert/');
export const adjustStock = (id, data) => api.post(`/products/${id}/adjust_stock/`, data);

export const getCategories = (params) => api.get('/categories/', { params });
export const createCategory = (data) => api.post('/categories/', data);
export const updateCategory = (id, data) => api.put(`/categories/${id}/`, data);
export const deleteCategory = (id) => api.delete(`/categories/${id}/`);

export const getProductPrefixes = () => api.get('/product-prefixes/');
export const createProductPrefix = (data) => api.post('/product-prefixes/', data);
export const updateProductPrefix = (id, data) => api.put(`/product-prefixes/${id}/`, data);
export const deleteProductPrefix = (id) => api.delete(`/product-prefixes/${id}/`);
export const getNextSku = (id) => api.get(`/product-prefixes/${id}/next_sku/`);
