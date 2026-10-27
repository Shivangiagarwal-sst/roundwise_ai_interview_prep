import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setAuthToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState({ demoEnabled: false, aiEnabled: false });

  // Load user session on mount
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        // Fetch public config
        const confRes = await api.get('/public/config').catch(() => null);
        if (confRes?.success && mounted) {
          setConfig(confRes.data);
        }

        // Fetch current user
        const res = await api.get('/auth/me');
        if (res.success && mounted) {
          if (res.token) setAuthToken(res.token);
          setUser(res.data);
        }
      } catch (err) {
        // Not authenticated
        if (mounted) {
          setAuthToken(null);
          setUser(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();
    return () => { mounted = false; };
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.success) {
      if (res.token) setAuthToken(res.token);
      setUser(res.data);
      return res.data;
    }
  };

  const register = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    if (res.success) {
      if (res.token) setAuthToken(res.token);
      setUser(res.data);
      return res.data;
    }
  };

  const demoLogin = async () => {
    const res = await api.post('/auth/demo');
    if (res.success) {
      if (res.token) setAuthToken(res.token);
      setUser(res.data);
      return res.data;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      setAuthToken(null);
      setUser(null);
    }
  };

  const updateProfile = async (updates) => {
    const res = await api.put('/auth/profile', updates);
    if (res.success) {
      setUser(res.data);
      return res.data;
    }
  };

  const completeOnboarding = async (onboardingData) => {
    const res = await api.post('/auth/onboarding', onboardingData);
    if (res.success) {
      setUser(res.data);
      return res.data;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        config,
        login,
        register,
        demoLogin,
        logout,
        updateProfile,
        completeOnboarding,
        isAuthenticated: !!user,
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
