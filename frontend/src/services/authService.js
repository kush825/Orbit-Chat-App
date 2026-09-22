import api from './api';

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  if (response.data) {
    localStorage.setItem('chat_user', JSON.stringify(response.data));
  }
  return response.data;
};

// Initiates registration and sends OTP
export const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
  // Do NOT store user in localStorage yet, wait for OTP
  return response.data;
};

// Verifies OTP and completes registration
export const verifyOtp = async (email, otp) => {
  const response = await api.post('/auth/verify-otp', { email, otp });
  if (response.data && response.data.user) {
    localStorage.setItem('chat_user', JSON.stringify(response.data.user));
  }
  return response.data;
};

// Resends OTP
export const resendOtp = async (email) => {
  const response = await api.post('/auth/resend-otp', { email });
  return response.data;
};

export const logout = async () => {
  try {
    await api.post('/auth/logout');
  } catch (err) {
    console.error('Logout error:', err);
  } finally {
    localStorage.removeItem('chat_user');
  }
};

export const seedAccounts = async () => {
  const response = await api.post('/auth/seed');
  return response.data;
};
