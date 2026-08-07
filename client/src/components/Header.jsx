import React from 'react';
import { Menu, Sun, Moon, Bell, User } from 'lucide-react';

const Header = ({ toggleSidebar, toggleTheme, darkMode }) => {
  return (
    <header className="sticky-top bg-surface border-bottom d-flex justify-content-between align-items-center px-4 py-3" style={{ backgroundColor: 'var(--surface-color)', borderColor: 'var(--border-color)', zIndex: 999 }}>
      <div className="d-flex align-items-center gap-3">
        <button 
          className="btn btn-sm btn-light border-0 p-2 d-md-none" 
          onClick={toggleSidebar}
          style={{ background: 'var(--bg-color)', color: 'var(--text-main)' }}
        >
          <Menu size={20} />
        </button>
        <h5 className="m-0 fw-bold d-none d-md-block">Overview</h5>
      </div>

      <div className="d-flex align-items-center gap-3">
        <button 
          className="btn btn-sm btn-light border-0 p-2 rounded-circle d-flex align-items-center justify-content-center" 
          onClick={toggleTheme}
          style={{ background: 'var(--bg-color)', color: 'var(--text-main)', width: '36px', height: '36px' }}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        
        <button 
          className="btn btn-sm btn-light border-0 p-2 rounded-circle d-flex align-items-center justify-content-center position-relative" 
          style={{ background: 'var(--bg-color)', color: 'var(--text-main)', width: '36px', height: '36px' }}
        >
          <Bell size={18} />
          <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle">
            <span className="visually-hidden">New alerts</span>
          </span>
        </button>

        <div className="d-flex align-items-center gap-2 border-start ps-3 ms-1" style={{ borderColor: 'var(--border-color)' }}>
          <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
            <User size={18} />
          </div>
          <div className="d-none d-lg-block">
            <p className="m-0 fw-semibold text-sm lh-1">Farm Admin</p>
            <span className="text-muted" style={{ fontSize: '11px' }}>pms@poultry.com</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
