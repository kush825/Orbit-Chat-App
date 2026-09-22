import api from './api';

export const getUsers = async (search = '') => {
  const response = await api.get(`/users?search=${encodeURIComponent(search)}`);
  return response.data;
};

export const getUserProfile = async () => {
  const response = await api.get('/users/profile');
  return response.data;
};

export const toggleBlockUser = async (userId, action) => {
  const response = await api.put(`/users/${userId}/block`, { action });
  return response.data;
};

export const deleteMyAccount = async () => {
  const response = await api.delete('/users/me');
  return response.data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const response = await api.put('/users/change-password', { currentPassword, newPassword });
  return response.data;
};

export const updateUserProfile = async (formData) => {
  const response = await api.put('/users/profile', formData);
  return response.data;
};
