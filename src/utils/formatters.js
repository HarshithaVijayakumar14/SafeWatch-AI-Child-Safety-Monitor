/**
 * Formatting and Export Helpers for SafeWatch
 */

export function formatTimestamp(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function formatDistance(distancePx, pxPerMeter = 50) {
  if (distancePx === undefined || distancePx === null) return 'N/A';
  const meters = (distancePx / pxPerMeter).toFixed(1);
  return `${Math.round(distancePx)} px (~${meters} m)`;
}

export function formatSpeed(speedMps) {
  if (speedMps === undefined || speedMps === null) return '0.0 m/s';
  return `${Number(speedMps).toFixed(1)} m/s`;
}

/**
 * Exports alert objects array to a downloadable CSV file
 */
export function exportToCSV(alerts, filename = 'safewatch-alerts.csv') {
  if (!alerts || !alerts.length) return;

  const headers = ['ID', 'Timestamp', 'Child ID', 'Hazard Zone', 'Zone Type', 'Alert Level', 'Distance (px)', 'Speed (m/s)', 'Status'];
  const rows = alerts.map(a => [
    `"${a.id || ''}"`,
    `"${a.timestamp || ''}"`,
    `"${a.child_id || 'ID-' + (a.person_id || 'N/A')}"`,
    `"${a.zone_name || a.zone || ''}"`,
    `"${a.zone_type || a.zone || ''}"`,
    `"${a.level || ''}"`,
    `"${a.distance_px !== undefined ? a.distance_px : ''}"`,
    `"${a.speed !== undefined ? a.speed : ''}"`,
    `"${a.acknowledged ? 'Acknowledged' : 'New'}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

