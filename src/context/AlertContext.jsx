import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { playDangerAlert, playWarningChime } from '../utils/audio';

const AlertContext = createContext();

export function AlertProvider({ children }) {
  const [alerts, setAlerts] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Load existing alerts on mount
  const refreshAlerts = useCallback(async () => {
    try {
      const data = await api.getAlerts();
      setAlerts(data || []);
    } catch (err) {
      console.warn('Failed to load alerts', err);
    }
  }, []);

  useEffect(() => {
    refreshAlerts();
  }, [refreshAlerts]);

  // Toast auto-removal helper
  const addToast = useCallback((alert) => {
    const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newToast = { ...alert, toastId };

    setToasts(prev => [newToast, ...prev].slice(0, 4)); // max 4 active toasts

    // Sound alert
    if (soundEnabled) {
      if (alert.level === 'DANGER') {
        playDangerAlert();
      } else if (alert.level === 'WARNING') {
        playWarningChime();
      }
    }

    // Auto dismiss after 6 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.toastId !== toastId));
    }, 6000);
  }, [soundEnabled]);

  const dismissToast = useCallback((toastId) => {
    setToasts(prev => prev.filter(t => t.toastId !== toastId));
  }, []);

  // Listen for real-time alerts from mockStream or external sources
  useEffect(() => {
    const handleNewAlert = (e) => {
      const alert = e.detail;
      setAlerts(prev => [alert, ...prev]);
      addToast(alert);
    };

    window.addEventListener('safewatch-new-alert', handleNewAlert);
    return () => {
      window.removeEventListener('safewatch-new-alert', handleNewAlert);
    };
  }, [addToast]);

  const acknowledgeAlert = async (id) => {
    try {
      await api.acknowledgeAlert(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
    } catch (err) {
      console.error('Ack failed', err);
    }
  };

  const clearAllAlerts = async () => {
    try {
      await api.clearAlerts();
      setAlerts([]);
    } catch (err) {
      console.error('Clear failed', err);
    }
  };

  const unreadCount = alerts.filter(a => !a.acknowledged).length;

  return (
    <AlertContext.Provider
      value={{
        alerts,
        unreadCount,
        toasts,
        dismissToast,
        acknowledgeAlert,
        clearAllAlerts,
        refreshAlerts,
        addToast,
        soundEnabled,
        setSoundEnabled
      }}
    >
      {children}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlerts must be used within AlertProvider');
  return ctx;
}

