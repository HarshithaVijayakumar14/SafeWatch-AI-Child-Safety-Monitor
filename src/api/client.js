/**
 * Unified SafeWatch API Client
 * 
 * Switching to a live backend only requires toggling USE_MOCK = false
 * and configuring the API_BASE_URL / WS_STREAM_URL.
 */
import { mockApi } from './mock';

export const USE_MOCK = true;
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const WS_STREAM_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/stream';

async function handleFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API Error [${response.status}]: ${errorBody || response.statusText}`);
  }

  return response.json();
}

export const api = {
  // --- Zones ---
  async getZones() {
    if (USE_MOCK) return mockApi.getZones();
    return handleFetch('/api/zones');
  },

  async saveZone(zone) {
    if (USE_MOCK) return mockApi.saveZone(zone);
    return handleFetch('/api/zones', {
      method: 'POST',
      body: JSON.stringify(zone),
    });
  },

  async deleteZone(id) {
    if (USE_MOCK) return mockApi.deleteZone(id);
    return handleFetch(`/api/zones/${id}`, {
      method: 'DELETE',
    });
  },

  // --- Alerts ---
  async getAlerts() {
    if (USE_MOCK) return mockApi.getAlerts();
    return handleFetch('/api/alerts');
  },

  async addAlert(alert) {
    if (USE_MOCK) return mockApi.addAlert(alert);
    return handleFetch('/api/alerts', {
      method: 'POST',
      body: JSON.stringify(alert),
    });
  },

  async acknowledgeAlert(id) {
    if (USE_MOCK) return mockApi.acknowledgeAlert(id);
    return handleFetch(`/api/alerts/${id}/ack`, {
      method: 'POST',
    });
  },

  async clearAlerts() {
    if (USE_MOCK) return mockApi.clearAlerts();
    return handleFetch('/api/alerts', {
      method: 'DELETE',
    });
  },

  // --- System Status ---
  async getStatus() {
    if (USE_MOCK) return mockApi.getStatus();
    return handleFetch('/api/status');
  },

  // --- Settings ---
  async getSettings() {
    if (USE_MOCK) return mockApi.getSettings();
    return handleFetch('/api/settings');
  },

  async saveSettings(settings) {
    if (USE_MOCK) return mockApi.saveSettings(settings);
    return handleFetch('/api/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  },

  async resetDefaults() {
    if (USE_MOCK) return mockApi.resetDefaults();
    return handleFetch('/api/reset', { method: 'POST' });
  }
};

