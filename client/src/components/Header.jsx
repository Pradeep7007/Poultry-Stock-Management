import React, { useState, useRef, useEffect } from 'react';
import { Menu, Sun, Moon, Bell, User, Check, CheckCheck, Trash2, AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

const Header = ({ toggleSidebar, toggleTheme, darkMode }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const { notifications, markAsRead, markAllAsRead, deleteNotification, clearAll, permission, requestPermission } = useNotifications();
  const { user } = useAuth();
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={16} className="text-success" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-warning" />;
      case 'error':
        return <AlertCircle size={16} className="text-danger" />;
      case 'info':
        return <Info size={16} className="text-info" />;
      default:
        return <Bell size={16} className="text-secondary" />;
    }
  };

  const formatRelativeTime = (timestamp) => {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <header className="sticky-top bg-surface border-bottom d-flex justify-content-between align-items-center px-3 px-md-4 py-2 py-md-3" style={{ backgroundColor: 'var(--surface-color)', borderColor: 'var(--border-color)', zIndex: 999 }}>
      <div className="d-flex align-items-center gap-2 gap-md-3">
        <button 
          className="btn btn-sm btn-light border-0 p-2" 
          onClick={toggleSidebar}
          style={{ background: 'var(--bg-color)', color: 'var(--text-main)' }}
          title="Toggle Sidebar"
        >
          <Menu size={20} />
        </button>
        <h5 className="m-0 fw-bold d-none d-md-block">Overview</h5>
      </div>

      <div className="d-flex align-items-center gap-2 gap-md-3">
        <button 
          className="btn btn-sm btn-light border-0 p-2 rounded-circle d-flex align-items-center justify-content-center" 
          onClick={toggleTheme}
          style={{ background: 'var(--bg-color)', color: 'var(--text-main)', width: '36px', height: '36px' }}
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        
        <div className="position-relative" ref={dropdownRef}>
          <button 
            className="btn btn-sm btn-light border-0 p-2 rounded-circle d-flex align-items-center justify-content-center position-relative" 
            onClick={() => setShowNotifications(!showNotifications)}
            style={{ background: 'var(--bg-color)', color: 'var(--text-main)', width: '36px', height: '36px' }}
            title="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span 
                className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-flex align-items-center justify-content-center" 
                style={{ 
                  fontSize: '9px', 
                  minWidth: '18px', 
                  height: '18px', 
                  padding: '2px',
                  border: '2px solid var(--surface-color)',
                  transform: 'translate(-30%, -30%)'
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div 
              className="notification-dropdown rounded-3 shadow-lg border animate-slide-up"
            >
              <div className="p-3 border-bottom d-flex justify-content-between align-items-center" style={{ borderColor: 'var(--border-color)' }}>
                <div className="d-flex align-items-center gap-2">
                  <h6 className="m-0 fw-bold">Notifications</h6>
                  {unreadCount > 0 && (
                    <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill px-2 py-1" style={{ fontSize: '11px' }}>
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead} 
                    className="btn btn-link p-0 text-decoration-none d-flex align-items-center gap-1"
                    style={{ fontSize: '12px', color: 'var(--primary)' }}
                  >
                    <CheckCheck size={14} />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {permission !== 'granted' && (
                <div className="bg-warning bg-opacity-10 p-2 px-3 border-bottom d-flex justify-content-between align-items-center" style={{ borderColor: 'var(--border-color)' }}>
                  <span className="small text-dark fw-medium" style={{ fontSize: '11px' }}>🔔 Get native alerts even when tab is closed</span>
                  <button
                    onClick={requestPermission}
                    className="btn btn-warning btn-sm py-0 px-2 fw-semibold"
                    style={{ fontSize: '11px' }}
                  >
                    Enable
                  </button>
                </div>
              )}

              <div className="notification-list" style={{ maxHeight: '360px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div className="p-4 text-center">
                    <div className="fs-3 mb-2">🔔</div>
                    <p className="m-0 text-muted small">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id}
                      className={`notification-item p-3 d-flex gap-3 align-items-start border-bottom position-relative ${!n.read ? 'unread-bg' : ''}`}
                      style={{ 
                        borderColor: 'var(--border-color)',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <div className="mt-1 flex-shrink-0">{getIcon(n.type)}</div>
                      <div className="flex-grow-1 min-w-0">
                        <div className="d-flex justify-content-between align-items-start gap-2">
                          <p className={`m-0 text-wrap text-break text-sm ${!n.read ? 'fw-bold' : 'fw-medium'}`} style={{ color: 'var(--text-main)', lineHeight: '1.3' }}>{n.title}</p>
                          <span className="text-muted flex-shrink-0" style={{ fontSize: '10px' }}>{formatRelativeTime(n.timestamp)}</span>
                        </div>
                        <p className="m-0 text-muted text-xs mt-1 text-wrap text-break" style={{ fontSize: '12px', lineHeight: '1.4' }}>{n.message}</p>
                      </div>
                      <div className="d-flex flex-column gap-2 flex-shrink-0 align-items-end">
                        {!n.read && (
                          <button 
                            onClick={() => markAsRead(n.id)}
                            className="btn p-0 text-primary border-0 bg-transparent hover-opacity-100"
                            style={{ opacity: 0.6 }}
                            title="Mark as read"
                          >
                            <Check size={14} />
                          </button>
                        )}
                        <button 
                          onClick={() => deleteNotification(n.id)}
                          className="btn p-0 text-danger border-0 bg-transparent hover-opacity-100"
                          style={{ opacity: 0.6 }}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {notifications.length > 0 && (
                <div className="p-2 border-top text-center" style={{ borderColor: 'var(--border-color)' }}>
                  <button 
                    onClick={clearAll} 
                    className="btn btn-link btn-sm text-danger text-decoration-none w-100 py-1"
                    style={{ fontSize: '12px' }}
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="d-flex align-items-center gap-2 border-start ps-3 ms-1" style={{ borderColor: 'var(--border-color)' }}>
          <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: '36px', height: '36px' }}>
            {user?.username ? user.username.charAt(0).toUpperCase() : <User size={18} />}
          </div>
          <div className="d-none d-lg-block">
            <p className="m-0 fw-semibold text-sm lh-1">{user?.fullName || user?.username || 'Farm Admin'}</p>
            <span className="text-muted" style={{ fontSize: '11px' }}>{user?.email || (user?.username ? `${user.username}@poultry.com` : 'pms@poultry.com')}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
