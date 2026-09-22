import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
  const [admin, setAdmin] = useState(() => {
    const saved = localStorage.getItem('Orbit_admin');
    return saved ? JSON.parse(saved) : null;
  });

  const loginAdmin = async (email, password) => {
    const response = await api.post('/admin/login', { email, password });
    if (response.data) {
      setAdmin(response.data);
      localStorage.setItem('Orbit_admin', JSON.stringify(response.data));
    }
    return response.data;
  };

  const logoutAdmin = () => {
    setAdmin(null);
    localStorage.removeItem('Orbit_admin');
  };

  return (
    <AdminContext.Provider value={{ admin, loginAdmin, logoutAdmin }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => useContext(AdminContext);
