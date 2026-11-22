/**
 * Unified SafeWatch API Client
 * 
 * Auto-detects live Python FastAPI backend at API_BASE_URL,
 * with graceful fallback to local cache if offline.
 */
import { mockApi } from './mock';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const WS_STREAM_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/stream';

let isBackendLive = false;

export function getBackendStatus() {
  return isBackendLive;
}

async function handleFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API Error [${response.status}]: ${errorBody || response.statusText}`);
    }

    isBackendLive = true;
    return response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    isBackendLive = false;
    throw err;
  }
}

export const api = {
  // --- Zones ---
  async getZones() {
    try {
      return await handleFetch('/api/zones');
    } catch (err) {
      return mockApi.getZones();
    }
  },

  async saveZone(zone) {
    try {
      return await handleFetch('/api/zones', {
        method: 'POST',
        body: JSON.stringify(zone),
      });
    } catch (err) {
      return mockApi.saveZone(zone);
    }
  },

  async deleteZone(id) {
    try {
      return await handleFetch(`/api/zones/${id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      return mockApi.deleteZone(id);
    }
  },

  // --- Alerts ---
  async getAlerts() {
    try {
      return await handleFetch('/api/alerts');
    } catch (err) {
      return mockApi.getAlerts();
    }
  },

  async addAlert(alert) {
    try {
      return await handleFetch('/api/alerts', {
        method: 'POST',
        body: JSON.stringify(alert),
      });
    } catch (err) {
      return mockApi.addAlert(alert);
    }
  },

  async acknowledgeAlert(id) {
    try {
      return await handleFetch(`/api/alerts/${id}/ack`, {
        method: 'POST',
      });
    } catch (err) {
      return mockApi.acknowledgeAlert(id);
    }
  },

  async clearAlerts() {
    try {
      return await handleFetch('/api/alerts', {
        method: 'DELETE',
      });
    } catch (err) {
      return mockApi.clearAlerts();
    }
  },

  // --- System Status ---
  async getStatus() {
    try {
      return await handleFetch('/api/status');
    } catch (err) {
      return mockApi.getStatus();
    }
  },

  // --- Settings ---
  async getSettings() {
    try {
      return await handleFetch('/api/settings');
    } catch (err) {
      return mockApi.getSettings();
    }
  },

  async saveSettings(settings) {
    try {
      return await handleFetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify(settings),
      });
    } catch (err) {
      return mockApi.saveSettings(settings);
    }
  },

  async resetDefaults() {
    try {
      return await handleFetch('/api/reset', { method: 'POST' });
    } catch (err) {
      return mockApi.resetDefaults();
    }
  },

  // --- Video File Upload ---
  async uploadVideo(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/api/upload-video`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
    return response.json();
  }
};

