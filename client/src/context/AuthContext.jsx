import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('hostel_pg_user');
      return (saved && saved !== 'undefined' && saved !== 'null') ? JSON.parse(saved) : null;
    } catch (e) {
      console.warn('Failed to parse saved user:', e);
      try { localStorage.removeItem('hostel_pg_user'); } catch (_) {}
      return null;
    }
  });
  const [token, setToken] = useState(() => {
    try {
      const t = localStorage.getItem('hostel_pg_token');
      return (t && t !== 'undefined' && t !== 'null') ? t : null;
    } catch (e) {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState(() => {
    try {
      const r = localStorage.getItem('hostel_pg_active_role');
      return (r && r !== 'undefined' && r !== 'null' && ['student', 'owner'].includes(r)) ? r : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    async function verifyAuth() {
      try {
        const storedToken = localStorage.getItem('hostel_pg_token');
        if (storedToken && storedToken !== 'undefined' && storedToken !== 'null') {
          try {
            const res = await api.getMe();
            if (res && res.user) {
              setUser(res.user);
              localStorage.setItem('hostel_pg_user', JSON.stringify(res.user));
              if (!activeRole) {
                setActiveRole(res.user.role);
                localStorage.setItem('hostel_pg_active_role', res.user.role);
              }
            }
          } catch (err) {
            console.warn('Session verification notice:', err);
            // Only logout if server explicitly responded with 401 Unauthorized (token invalid / revoked)
            if (err.status === 401 || (err.data && (err.data.code === 'INVALID_TOKEN' || err.data.code === 'NO_TOKEN'))) {
              logout();
            }
          }
        }
      } catch (e) {
        console.warn('Auth verification storage access warning:', e);
      } finally {
        setLoading(false);
      }
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
