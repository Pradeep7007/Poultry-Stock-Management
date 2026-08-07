import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = ({ onLogout, toggleTheme, darkMode }) => {
  const location = useLocation();

  return (
    <nav className="navbar navbar-expand-lg navbar-light navbar-custom sticky-top py-3">
      <div className="container">
        <Link className="navbar-brand fw-bold" to="/">
          <span style={{ color: 'var(--primary-color)' }}>PMS</span> Phase 1
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <Link className={`nav-link ${location.pathname === '/' ? 'active fw-bold' : ''}`} to="/">Dashboard</Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link ${location.pathname === '/egg' ? 'active fw-bold' : ''}`} to="/egg">Egg Management</Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link ${location.pathname === '/batch/new' ? 'active fw-bold' : ''}`} to="/batch/new">New Batch</Link>
            </li>
          </ul>
          <div className="d-flex align-items-center">
            <button className="btn btn-outline-secondary me-3" onClick={toggleTheme} title="Toggle Theme">
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
            <button className="btn btn-danger" onClick={onLogout}>Logout</button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
