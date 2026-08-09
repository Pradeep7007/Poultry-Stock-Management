import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EggManagement from './pages/EggManagement';
import BatchCreation from './pages/BatchCreation';
import HenManagement from './pages/HenManagement';
import FeedManagement from './pages/FeedManagement';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './services/queries';
import VaccineManagement from './pages/VaccineManagement';
import WorkerManagement from './pages/WorkerManagement';
import WorkerDetails from './pages/WorkerDetails';
import Layout from './components/Layout';
import { NotificationProvider } from './context/NotificationContext';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const auth = localStorage.getItem('pms_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
    
    const isDark = localStorage.getItem('pms_theme') === 'dark';
    setDarkMode(isDark);
    if (isDark) {
      document.body.classList.add('dark-mode');
    }
  }, []);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('pms_theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('pms_theme', 'light');
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('pms_auth', 'true');
    navigate('/');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('pms_auth');
    navigate('/login');
  };

  const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated) return <Navigate to="/login" />;
    return (
      <Layout onLogout={handleLogout} toggleTheme={toggleTheme} darkMode={darkMode}>
        {children}
      </Layout>
    );
  };

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <Toaster position="top-right" toastOptions={{
          style: {
            background: darkMode ? '#1E293B' : '#fff',
            color: darkMode ? '#F8FAFC' : '#333',
          }
        }}/>
        <div className="app-container">
          <Routes>
            <Route path="/login" element={!isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/egg" element={<ProtectedRoute><EggManagement /></ProtectedRoute>} />
            <Route path="/batch/new" element={<ProtectedRoute><BatchCreation /></ProtectedRoute>} />
            <Route path="/hens" element={<ProtectedRoute><HenManagement /></ProtectedRoute>} />
            <Route path="/feed" element={<ProtectedRoute><FeedManagement /></ProtectedRoute>} />
            <Route path="/vaccines" element={<ProtectedRoute><VaccineManagement /></ProtectedRoute>} />
            <Route path="/workers" element={<ProtectedRoute><WorkerManagement /></ProtectedRoute>} />
            <Route path="/workers/:id" element={<ProtectedRoute><WorkerDetails /></ProtectedRoute>} />
          </Routes>
        </div>
        <ReactQueryDevtools initialIsOpen={false} />
      </NotificationProvider>
    </QueryClientProvider>
  );
}

export default App;
