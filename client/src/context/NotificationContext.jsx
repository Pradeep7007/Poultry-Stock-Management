import React, { createContext, useContext, useState, useEffect } from 'react';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('pms_notifications');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: '1',
        type: 'warning',
        title: 'Low Feed Alert',
        message: 'Feed stock of Starter Feed is below 200kg.',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
        read: false
      },
      {
        id: '2',
        type: 'error',
        title: 'Mortality Spike',
        message: "Batch 'Batch 2026-A' reported 12 deaths today.",
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 hours ago
        read: false
      },
      {
        id: '3',
        type: 'info',
        title: 'Vaccine Reminder',
        message: 'Lasota vaccine is scheduled for Batch 2026-A tomorrow.',
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
        read: true
      },
      {
        id: '4',
        type: 'success',
        title: 'Google Sheets Sync',
        message: 'Poultry data has been successfully synced with Google Sheets.',
        timestamp: new Date(Date.now() - 3600000 * 48).toISOString(), // 2 days ago
        read: true
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('pms_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = (type, title, message) => {
    const newNotif = {
      id: Date.now().toString(),
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const deleteNotification = (id) => {
    setNotifications(prev =>
      prev.filter(n => n.id !== id)
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAll
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
