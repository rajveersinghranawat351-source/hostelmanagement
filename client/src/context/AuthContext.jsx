import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('hostel_pg_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('hostel_pg_token') || null);
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState(() => localStorage.getItem('hostel_pg_active_role') || null);

  useEffect(() => {
    async function verifyAuth() {
      const storedToken = localStorage.getItem('hostel_pg_token');
      if (storedToken) {
        try {
          const res = await api.getMe();
          setUser(res.user);
          localStorage.setItem('hostel_pg_user', JSON.stringify(res.user));
          if (!activeRole) {
            setActiveRole(res.user.role);
            localStorage.setItem('hostel_pg_active_role', res.user.role);
          }
        } catch (err) {
          console.warn('Session verification failed, logging out:', err);
          logout();
        }
      }
      setLoading(false);
    }
    verifyAuth();
  }, []);

  const selectRole = (role) => {
    setActiveRole(role);
    localStorage.setItem('hostel_pg_active_role', role);
  };

  const login = (authToken, userData) => {
    setToken(authToken);
    setUser(userData);
    setActiveRole(userData.role);
    localStorage.setItem('hostel_pg_token', authToken);
    localStorage.setItem('hostel_pg_user', JSON.stringify(userData));
    localStorage.setItem('hostel_pg_active_role', userData.role);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setActiveRole(null);
    localStorage.removeItem('hostel_pg_token');
    localStorage.removeItem('hostel_pg_user');
    localStorage.removeItem('hostel_pg_active_role');
  };

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      setUser(res.user);
      localStorage.setItem('hostel_pg_user', JSON.stringify(res.user));
      return res.user;
    } catch (e) {
      console.error('Failed to refresh user', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        activeRole,
        selectRole,
        login,
        logout,
        refreshUser,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
