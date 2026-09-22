import api from './api';

export const getConversations = async () => {
  const response = await api.get('/conversations');
  return response.data;
};

export const accessConversation = async (userId) => {
  const response = await api.post('/conversations', { userId });
  return response.data;
};

export const createGroupConversation = async (formData) => {
  const response = await api.post('/conversations/group', formData);
  return response.data;
};

export const addToGroup = async (conversationId, userId) => {
  const response = await api.put('/conversations/groupadd', { conversationId, userId });
  return response.data;
};

export const removeFromGroup = async (conversationId, userId) => {
  const response = await api.put('/conversations/groupremove', { conversationId, userId });
  return response.data;
};

export const muteConversations = async (conversationIds, duration) => {
  const response = await api.put('/conversations/mute', { conversationIds, duration });
  return response.data;
};

export const deleteConversations = async (conversationIds) => {
  const response = await api.put('/conversations/delete', { conversationIds });
  return response.data;
};

export const pinConversations = async (conversationIds) => {
  const response = await api.put('/conversations/pin', { conversationIds });
  return response.data;
};

export const togglePinMessage = async (conversationId, msgId) => {
  const response = await api.put(`/conversations/${conversationId}/messages/${msgId}/pin`);
  return response.data;
};
