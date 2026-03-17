import api from './axios';

export const getRoles = () => api.get('/roles/');
export const createRole = (data) => api.post('/roles/', data);
export const updateRole = (id, data) => api.put(`/roles/${id}/`, data);
export const deleteRole = (id) => api.delete(`/roles/${id}/`);

export const getPermissions = () => api.get('/permissions/');
export const assignPermissions = (roleId, data) => api.post(`/roles/${roleId}/assign_permissions/`, data);

export const getUsers = () => api.get('/users/');
export const createUser = (data) => api.post('/users/', data);
export const updateUser = (id, data) => api.put(`/users/${id}/`, data);
export const assignRole = (userId, data) => api.post(`/users/${userId}/assign_role/`, data);
