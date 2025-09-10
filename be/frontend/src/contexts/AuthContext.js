// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const debug = process.env.REACT_APP_DEBUG === 'true';

  const log = (message, data = null) => {
    if (debug) {
      console.log(`[AuthContext] ${message}`, data ? data : '');
    }
  };

  // Kiểm tra authentication khi component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    log('Checking auth status...');
    setLoading(true);
    
    try {
      if (authService.isAuthenticated()) {
        const currentUser = authService.getCurrentUser();
        log('User is authenticated', currentUser);
        setUser(currentUser);
      } else {
        log('User is not authenticated');
        setUser(null);
      }
    } catch (error) {
      console.error('[AuthContext ERROR] Check auth status failed', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    log('Attempting login', { email });
    setLoading(true);
    setError(null);

    try {
      const result = await authService.login(email, password);
      
      if (result.success) {
        log('Login successful', result.user);
        setUser(result.user);
        return { success: true };
      } else {
        log('Login failed', result.error);
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('[AuthContext ERROR] Login error', error);
      const errorMessage = 'An unexpected error occurred during login';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    log('Logging out');
    authService.logout();
    setUser(null);
    setError(null);
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    clearError,
    checkAuthStatus,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
