import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import confetti from 'canvas-confetti';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('hr_token'));
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('hr_theme') || 'dark');
  const [todayPunch, setTodayPunch] = useState(null);
  const [toast, setToast] = useState(null);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hr_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Load user session
  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await api.auth.getMe();
        setUser(data.user);
        if (data.user?.employee_id) {
          fetchTodayPunch();
        }
      } catch (err) {
        console.warn('Session expired or invalid:', err.message);
        logout();
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [token]);

  const fetchTodayPunch = async () => {
    try {
      const data = await api.timelogs.getToday();
      setTodayPunch(data.log);
    } catch (err) {
      console.warn('Could not fetch today punch status:', err.message);
    }
  };

  const login = async (username, password) => {
    try {
      const res = await api.auth.login(username, password);
      localStorage.setItem('hr_token', res.token);
      setToken(res.token);
      setUser(res.user);
      showToast(`Welcome back, ${res.user.first_name || res.user.username}!`, 'success');
      
      if (res.user.employee_id) {
        setTimeout(fetchTodayPunch, 100);
      }
      return res;
    } catch (err) {
      showToast(err.message, 'danger');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('hr_token');
    setToken(null);
    setUser(null);
    setTodayPunch(null);
    showToast('Logged out successfully.', 'info');
  };

  const refreshUser = async () => {
    try {
      const data = await api.auth.getMe();
      setUser(data.user);
      fetchTodayPunch();
    } catch (err) {
      console.error('Refresh user error:', err);
    }
  };

  const punchAction = async (action, notes = '') => {
    try {
      const res = await api.timelogs.punch(action, notes);
      setTodayPunch(res.log);
      showToast(res.message, 'success');

      if (action === 'clock_in') {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 }
        });
      }

      return res;
    } catch (err) {
      showToast(err.message, 'danger');
      throw err;
    }
  };

  const isManager = user?.role === 'manager';
  const isAuthenticated = Boolean(user && token);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isManager,
        loading,
        theme,
        toggleTheme,
        todayPunch,
        fetchTodayPunch,
        punchAction,
        login,
        logout,
        refreshUser,
        toast,
        showToast
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
