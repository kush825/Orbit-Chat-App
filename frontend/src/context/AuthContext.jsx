import React, { createContext, useState, useEffect, useContext } from 'react';
import { login as loginApi, register as registerApi, verifyOtp as verifyOtpApi, resendOtp as resendOtpApi, logout as logoutApi } from '../services/authService';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('chat_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.token && !parsed._id) {
          localStorage.removeItem('chat_user');
          return null;
        }
        return parsed;
      } catch (err) {
        localStorage.removeItem('chat_user');
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(false);

  // Sync session changes across tabs if localStorage is modified
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'chat_user') {
        const newUser = e.newValue ? JSON.parse(e.newValue) : null;
        setUser(newUser);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Fetch fresh profile on load to avoid stale localStorage data (like missing blockedUsers)
  useEffect(() => {
    const fetchLatestProfile = async () => {
      const saved = localStorage.getItem('chat_user');
      if (saved) {
        const parsedUser = JSON.parse(saved);
        if (parsedUser && parsedUser.token) {
          try {
            const res = await api.get('/users/profile');
            // Update state with fresh DB data, keeping the JWT token
            const freshUser = { ...res.data, token: parsedUser.token };
            setUser(freshUser);
            localStorage.setItem('chat_user', JSON.stringify(freshUser));
          } catch (err) {
            console.error('Failed to sync latest profile', err);
            if (err.response?.status === 401) {
              localStorage.removeItem('chat_user');
              setUser(null);
            }
          }
        }
      }
    };
    fetchLatestProfile();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await loginApi(email, password);
      setUser(data);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const data = await registerApi(userData);
      // We do NOT set user here anymore, because they aren't verified yet
      return data;
    } finally {
      setLoading(false);
    }
  };

  const verifyRegistration = async (email, otp) => {
    setLoading(true);
    try {
      const data = await verifyOtpApi(email, otp);
      if (data && data.user) {
        setUser(data.user);
      }
      return data;
    } finally {
      setLoading(false);
    }
  };

  const resendRegistrationOtp = async (email) => {
    setLoading(true);
    try {
      const data = await resendOtpApi(email);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await logoutApi();
    setUser(null);
  };

  const updateUserState = (updatedUser) => {
    const newUserData = { ...user, ...updatedUser };
    setUser(newUserData);
    localStorage.setItem('chat_user', JSON.stringify(newUserData));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, verifyRegistration, resendRegistrationOtp, logout, updateUserState }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
