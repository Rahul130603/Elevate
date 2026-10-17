import { gentizeText } from '../utils/gentizeBrand.js';
import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export const DEFAULT_ADMIN_USER = {
  id: 'u_admin',
  name: 'Gentize',
  email: 'admin@elevate.com',
  phone: '+91 9876543210',
  role: 'ADMIN',
  is_active: 1,
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('gentize_user');
      const savedUser = stored ? JSON.parse(stored) : DEFAULT_ADMIN_USER;
      return { ...savedUser, name: gentizeText(savedUser.name) };
    } catch {
      return DEFAULT_ADMIN_USER;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('gentize_token') || 'bypass_token');

  const login = async (username, password) => {
    setUser(DEFAULT_ADMIN_USER);
    return DEFAULT_ADMIN_USER;
  };

  const logout = () => {
    // Soft logout: keep default admin for bypass or switch role
    console.log('Logout clicked - Auth bypass active');
  };

  return (
    <AuthContext.Provider value={{ user, setUser, token, setToken, login, logout, loading: false }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: DEFAULT_ADMIN_USER,
      setUser: () => {},
      token: 'bypass_token',
      setToken: () => {},
      login: async () => DEFAULT_ADMIN_USER,
      logout: () => {},
      loading: false,
    };
  }
  return ctx;
}

export default AuthContext;
