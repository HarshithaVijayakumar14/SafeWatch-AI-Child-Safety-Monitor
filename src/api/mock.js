/**
 * SafeWatch Mock Data Store (localStorage backed)
 * Implements mock equivalents for all REST endpoints.
 */
import { INITIAL_ZONES, INITIAL_SETTINGS, INITIAL_ALERTS } from '../utils/presets';

const STORAGE_KEYS = {
  ZONES: 'safewatch_zones_v1',
  SETTINGS: 'safewatch_settings_v1',
  ALERTS: 'safewatch_alerts_v1'
};

function getStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn('Storage read failed', e);
    return fallback;
  }
}

function setStorage(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.warn('Storage write failed', e);
  }
}

export const mockApi = {
  async getZones() {
    await simulateDelay(120);
    return getStorage(STORAGE_KEYS.ZONES, INITIAL_ZONES);
  },

  async saveZone(zone) {
    await simulateDelay(150);
    const zones = getStorage(STORAGE_KEYS.ZONES, INITIAL_ZONES);
    const existingIndex = zones.findIndex(z => z.id === zone.id);
    let updated;
    if (existingIndex >= 0) {
      updated = [...zones];
      updated[existingIndex] = { ...updated[existingIndex], ...zone };
    } else {
      const newZone = {
        ...zone,
        id: zone.id || `zone-${Date.now()}`
      };
      updated = [...zones, newZone];
    }
    setStorage(STORAGE_KEYS.ZONES, updated);
    return updated;
  },

  async deleteZone(id) {
    await simulateDelay(100);
    const zones = getStorage(STORAGE_KEYS.ZONES, INITIAL_ZONES);
    const filtered = zones.filter(z => z.id !== id);
    setStorage(STORAGE_KEYS.ZONES, filtered);
    return filtered;
  },

  async getAlerts() {
    await simulateDelay(150);
    return getStorage(STORAGE_KEYS.ALERTS, INITIAL_ALERTS);
  },

  async addAlert(alert) {
    const alerts = getStorage(STORAGE_KEYS.ALERTS, INITIAL_ALERTS);
    const newAlert = {
      ...alert,
      id: alert.id || `alt-${Date.now()}`,
      timestamp: alert.timestamp || new Date().toISOString(),
      acknowledged: false
    };
    const updated = [newAlert, ...alerts].slice(0, 200); // keep max 200
    setStorage(STORAGE_KEYS.ALERTS, updated);
    return newAlert;
  },

  async acknowledgeAlert(id) {
    const alerts = getStorage(STORAGE_KEYS.ALERTS, INITIAL_ALERTS);
    const updated = alerts.map(a => a.id === id ? { ...a, acknowledged: true } : a);
    setStorage(STORAGE_KEYS.ALERTS, updated);
    return updated;
  },

  async clearAlerts() {
    setStorage(STORAGE_KEYS.ALERTS, []);
    return [];
  },

  async getSettings() {
    await simulateDelay(80);
    return getStorage(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
  },

  async saveSettings(settings) {
    await simulateDelay(120);
    const current = getStorage(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    const updated = { ...current, ...settings };
    setStorage(STORAGE_KEYS.SETTINGS, updated);
    return updated;
  },

  async getStatus() {
    return {
      status: 'SAFE',
      fps: 29.8,
      latency_ms: 18,
      backend_connected: false,
      demo_mode: true,
      active_zones: (getStorage(STORAGE_KEYS.ZONES, INITIAL_ZONES) || []).length,
      model_loaded: 'YOLOv8n-ChildPose-DeepSORT',
      hardware: 'GPU Accel (Simulated WebGPU/WebGL)'
    };
  },

  async resetDefaults() {
    setStorage(STORAGE_KEYS.ZONES, INITIAL_ZONES);
    setStorage(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    setStorage(STORAGE_KEYS.ALERTS, INITIAL_ALERTS);
    return { success: true };
  }
};

function simulateDelay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

