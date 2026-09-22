import api from './api';

export const getAppStats = async () => {
  const response = await api.get('/admin/stats');
  return response.data;
};

export const getAllUsers = async () => {
  const response = await api.get('/admin/users');
  return response.data;
};

export const deleteUser = async (userId) => {
  const response = await api.delete(`/admin/users/${userId}`);
  return response.data;
};

export const hardDeleteUser = async (userId) => {
  const response = await api.delete(`/admin/users/${userId}/hard`);
  return response.data;
};

export const getNotifications = async () => {
  const response = await api.get('/admin/notifications');
  return response.data;
};

export const markNotificationsRead = async () => {
  const response = await api.put('/admin/notifications/read');
  return response.data;
};

export const getUserDetails = async (userId) => {
  const response = await api.get(`/admin/users/${userId}`);
  return response.data;
};

export const toggleBlockUser = async (userId) => {
  const response = await api.put(`/admin/users/${userId}/block`);
  return response.data;
};

export const toggleUserRole = async (userId) => {
  const response = await api.put(`/admin/users/${userId}/role`);
  return response.data;
};
