import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Egg, Layers, LogOut, Activity, ShoppingBag, Users, Syringe } from 'lucide-react';

const Sidebar = ({ isOpen, onLogout }) => {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Egg Management', path: '/egg', icon: <Egg size={20} /> },
    { name: 'Hen Management', path: '/hens', icon: <Users size={20} /> },
    { name: 'Feed Management', path: '/feed', icon: <ShoppingBag size={20} /> },
    { name: 'Vaccines & Medicine', path: '/vaccines', icon: <Syringe size={20} /> },
    { name: 'Create Batch', path: '/batch/new', icon: <Layers size={20} /> },
  ];

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`} style={{
      width: '260px',
      backgroundColor: 'var(--sidebar-bg)',
      color: 'var(--sidebar-text)',
      position: 'fixed',
      height: '100vh',
      zIndex: 1000,
      transition: 'transform 0.3s ease',
      transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div className="p-4 d-flex align-items-center gap-3">
        <div className="bg-primary text-white rounded d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
          <span className="fs-4">🐓</span>
        </div>
        <h4 className="m-0 text-white fw-bold fs-5">PMS Pro</h4>
      </div>

      <div className="px-3 mt-4 flex-grow-1">
        <p className="text-uppercase small fw-bold mb-3" style={{ opacity: 0.5, letterSpacing: '1px' }}>Menu</p>
        <ul className="nav flex-column gap-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li className="nav-item" key={item.name}>
                <Link 
                  to={item.path} 
                  className={`nav-link d-flex align-items-center gap-3 rounded px-3 py-2 ${isActive ? 'active' : ''}`}
                  style={{
                    color: isActive ? 'var(--sidebar-active)' : 'var(--sidebar-text)',
                    backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {item.icon}
                  <span className="fw-medium">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="p-3 border-top" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <button 
          onClick={onLogout}
          className="btn w-100 d-flex align-items-center gap-2 justify-content-center text-white"
          style={{ backgroundColor: 'rgba(244, 63, 94, 0.1)', color: '#FB7185' }}
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
