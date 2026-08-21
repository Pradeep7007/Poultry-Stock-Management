import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  // In-App Notifications State (Persisted in localStorage)
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('pms_notifications');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [
      {
        id: '1',
        type: 'warning',
        title: 'Low Feed Alert',
        message: 'Starter Feed stock is below 200kg.',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        read: false
      },
      {
        id: '2',
        type: 'error',
        title: 'Mortality Alert',
        message: "Batch 'Batch 2026-A' reported 12 deaths today.",
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
        read: false
      },
      {
        id: '3',
        type: 'info',
        title: 'Vaccine Reminder',
        message: 'Lasota vaccine is scheduled for Batch 2026-A tomorrow.',
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
        read: true
      }
    ];
  });

  // Scheduled Reminders / Events State (Persisted in localStorage)
  const [reminders, setReminders] = useState(() => {
    const saved = localStorage.getItem('pms_reminders');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [];
  });

  // Browser Native Notification Permission State
  const [permission, setPermission] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  // Sync Notifications to localStorage
  useEffect(() => {
    localStorage.setItem('pms_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Sync Reminders to localStorage
  useEffect(() => {
    localStorage.setItem('pms_reminders', JSON.stringify(reminders));
  }, [reminders]);

  // Request Native Browser Notification Permission
  const requestPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const result = await Notification.requestPermission();
        setPermission(result);
        return result;
      } catch (err) {
        console.error('Failed to request notification permission:', err);
      }
    }
    return 'denied';
  };

  // Helper to send native OS notification
  const sendNativeNotification = useCallback((title, options = {}) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          icon: '/favicon.ico',
          badge: '/logo192.png',
          vibrate: [200, 100, 200],
          ...options
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (e) {
        console.error('Error dispatching native notification:', e);
      }
    }
  }, []);

  // Add In-App Notification (and optionally dispatch Native OS Notification)
  const addNotification = useCallback((type, title, message, triggerNative = true) => {
    const newNotif = {
      id: Date.now().toString(),
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);

    if (triggerNative) {
      sendNativeNotification(title, { body: message });
    }
  }, [sendNativeNotification]);

  // Add Scheduled Reminder Event
  const addReminder = (reminderData) => {
    const newReminder = {
      id: Date.now().toString(),
      title: reminderData.title,
      datetime: reminderData.datetime, // ISO string or timestamp
      category: reminderData.category || 'General', // Vaccine, Feed, Batch, Task
      recurring: reminderData.recurring || 'none', // none, daily, weekly, monthly
      triggered: false,
      createdAt: new Date().toISOString()
    };
    setReminders(prev => [...prev, newReminder]);
    addNotification('info', 'Reminder Scheduled', `Scheduled "${reminderData.title}" for ${new Date(reminderData.datetime).toLocaleString()}`, false);
  };

  // Delete Reminder Event
  const deleteReminder = (id) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  // Check Due Reminders (Runs on interval & tab visibility change)
  const checkDueReminders = useCallback(() => {
    const now = Date.now();
    setReminders(prevReminders => {
      let updated = false;
      const nextReminders = prevReminders.map(r => {
        const reminderTime = new Date(r.datetime).getTime();
        if (!r.triggered && reminderTime <= now) {
          updated = true;
          // Trigger Notification
          addNotification('warning', `⏰ Reminder: ${r.title}`, `Scheduled event "${r.title}" is due now!`, true);
          return { ...r, triggered: true };
        }
        return r;
      });
      return updated ? nextReminders : prevReminders;
    });
  }, [addNotification]);

  // Periodic reminder checking loop & tab focus re-check
  useEffect(() => {
    checkDueReminders();

    // Check every 30 seconds
    const interval = setInterval(checkDueReminders, 30000);

    // Re-check whenever tab becomes visible (solves setTimeout browser suspension)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkDueReminders();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkDueReminders]);

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
      reminders,
      permission,
      requestPermission,
      sendNativeNotification,
      addNotification,
      addReminder,
      deleteReminder,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAll
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
