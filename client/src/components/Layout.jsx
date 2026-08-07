import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ children, onLogout, toggleTheme, darkMode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Close sidebar by default on smaller screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 992) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    
    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
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

      <div className="main-content" style={{ marginLeft: isSidebarOpen && window.innerWidth >= 992 ? '260px' : '0' }}>
        <Header toggleSidebar={toggleSidebar} toggleTheme={toggleTheme} darkMode={darkMode} />
        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
