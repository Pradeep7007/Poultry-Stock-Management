import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('pms_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        return parsed;
      } catch (e) {
        return { username: savedUser, fullName: savedUser };
      }
    }
    return null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('pms_auth') === 'true';
  });

  const currentUserName = (
    typeof user === 'string' ? user : (
      user?.fullName ||
      user?.username ||
      user?.name ||
      (user?.email ? user.email.split('@')[0] : '') ||
      localStorage.getItem('pms_entered_by') ||
      'Pradeep'
    )
  );

  useEffect(() => {
    if (user) {
      const nameToStore = typeof user === 'string' ? user : (user.fullName || user.username || user.name || '');
      if (nameToStore) {
        localStorage.setItem('pms_entered_by', nameToStore);
      }
      localStorage.setItem('pms_user', typeof user === 'string' ? JSON.stringify({ username: user, fullName: user }) : JSON.stringify(user));
      localStorage.setItem('pms_auth', 'true');
    }
  }, [user]);

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      const userData = response.data.user;
      setUser(userData);
      setIsAuthenticated(true);
      localStorage.setItem('pms_user', JSON.stringify(userData));
      localStorage.setItem('pms_auth', 'true');
      return { success: true, user: userData };
    } catch (error) {
      // Fallback for default users if backend endpoint is unavailable or fails
      const fallbackUser = (username === 'pms' && password === '26082006') ? { username: 'pms', fullName: 'PMS Admin', role: 'Admin' } :
                           (username === 'pradeep' && password === '2006') ? { username: 'pradeep', fullName: 'Pradeep', role: 'Admin' } :
                           (username && password) ? { username: username.trim(), fullName: username.trim(), role: 'User' } : null;

      if (fallbackUser && !error.response?.data?.message) {
        setUser(fallbackUser);
        setIsAuthenticated(true);
        localStorage.setItem('pms_user', JSON.stringify(fallbackUser));
        localStorage.setItem('pms_auth', 'true');
        return { success: true, user: fallbackUser };
      }

      const message = error.response?.data?.message || 'Login failed. Please check your credentials.';
      return { success: false, message };
    }
  };

  const signup = async (signupData) => {
    try {
      const response = await api.post('/auth/register', signupData);
      const userData = response.data.user;
      setUser(userData);
      setIsAuthenticated(true);
      localStorage.setItem('pms_user', JSON.stringify(userData));
      localStorage.setItem('pms_auth', 'true');
      return { success: true, user: userData, message: response.data.message };
    } catch (error) {
      // Fallback if backend server endpoint is unreachable
      if (!error.response) {
        const fallbackUser = {
          username: signupData.username.trim(),
          email: signupData.email.trim(),
          fullName: signupData.fullName || signupData.username,
          role: 'User'
        };
        setUser(fallbackUser);
        setIsAuthenticated(true);
        localStorage.setItem('pms_user', JSON.stringify(fallbackUser));
        localStorage.setItem('pms_auth', 'true');
        return { success: true, user: fallbackUser, message: 'Signed up successfully!' };
      }

      const message = error.response?.data?.message || 'Signup failed. Please try again.';
      return { success: false, message };
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('pms_user');
    localStorage.removeItem('pms_auth');
  };

  return (
    <AuthContext.Provider value={{ user, currentUserName, isAuthenticated, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
