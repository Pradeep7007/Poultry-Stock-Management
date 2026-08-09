import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ children, onLogout, toggleTheme, darkMode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 992);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth < 992) {
        setIsSidebarOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Prefetch all data when layout mounts
    import('../services/queries').then(({ prefetchAllDashboardData }) => {
      prefetchAllDashboardData();
    });

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="layout-wrapper">
      <Sidebar isOpen={isSidebarOpen} onLogout={onLogout} />
      
      {/* Overlay for mobile when sidebar is open */}
      {isSidebarOpen && window.innerWidth < 992 && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark" 
          style={{ zIndex: 999, opacity: 0.5 }} 
          onClick={toggleSidebar}
        ></div>
      )}

      <div 
        className="main-content" 
        style={{ 
          marginLeft: isSidebarOpen && windowWidth >= 992 ? '260px' : '0',
          transition: 'margin-left 0.3s ease',
          minHeight: '100vh'
        }}
      >
        <Header toggleSidebar={toggleSidebar} toggleTheme={toggleTheme} darkMode={darkMode} />
        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
