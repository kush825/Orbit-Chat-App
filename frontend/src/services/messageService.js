import api from './api';

export const fetchMessages = async (conversationId) => {
  const response = await api.get(`/messages/${conversationId}`);
  return response.data;
};

export const sendMessageApi = async (formData) => {
  // Do NOT explicitly override Content-Type header so Axios can set boundary automatically for FormData
  const response = await api.post('/messages', formData);
  return response.data;
};

export const editMessageApi = async (id, text) => {
  const response = await api.put(`/messages/${id}`, { text });
  return response.data;
};

export const deleteMessageApi = async (messageId, type = 'for_everyone') => {
  const response = await api.delete(`/messages/${messageId}?type=${type}`);
  return response.data;
};

export const reactToMessageApi = async (id, emoji) => {
  const response = await api.post(`/messages/${id}/react`, { emoji });
  return response.data;
};

export const clearChatApi = async (conversationId) => {
  const response = await api.delete(`/messages/conversation/${conversationId}`);
  return response.data;
};
