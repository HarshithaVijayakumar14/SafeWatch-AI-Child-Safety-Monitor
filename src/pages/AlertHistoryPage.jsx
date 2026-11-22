import React, { useState, useMemo } from 'react';
import { useAlerts } from '../context/AlertContext';
import { Badge, HazardBadge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { 
  BellRing, 
  Search, 
  Download, 
  Filter, 
  Calendar, 
  Check, 
  Image as ImageIcon, 
  ExternalLink,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { formatTimestamp, formatDistance, formatSpeed, exportToCSV } from '../utils/formatters';

export function AlertHistoryPage() {
  const { alerts, acknowledgeAlert, clearAllAlerts } = useAlerts();

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');

  // Modal preview
  const [selectedAlert, setSelectedAlert] = useState(null);

  // Filtered dataset
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alt => {
      // Search match
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const childMatch = (alt.child_id || '').toLowerCase().includes(term);
        const zoneMatch = (alt.zone_name || alt.zone || '').toLowerCase().includes(term);
        const notesMatch = (alt.notes || '').toLowerCase().includes(term);
        if (!childMatch && !zoneMatch && !notesMatch) return false;
      }

      // Level match
      if (levelFilter !== 'ALL' && alt.level !== levelFilter) {
        return false;
      }

      // Zone match
      if (zoneFilter !== 'ALL' && (alt.zone_type || alt.zone) !== zoneFilter) {
        return false;
      }

      // Date match
      if (dateFilter === 'TODAY') {
        const altDate = new Date(alt.timestamp).toDateString();
        const today = new Date().toDateString();
        if (altDate !== today) return false;
      } else if (dateFilter === 'WEEK') {
        const oneWeekAgo = Date.now() - 7 * 24 * 3600 * 1000;
        if (new Date(alt.timestamp).getTime() < oneWeekAgo) return false;
      }

      return true;
    });
  }, [alerts, searchTerm, levelFilter, zoneFilter, dateFilter]);

  const handleExportCSV = () => {
    exportToCSV(filteredAlerts, `safewatch-alerts-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleAcknowledgeAll = () => {
    alerts.forEach(a => {
      if (!a.acknowledged) acknowledgeAlert(a.id);
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <BellRing className="w-6 h-6 text-rose-500" />
            Alert Incident Log
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Auditable record of all hazardous proximity events, approach vectors, and guardian actions
          </p>
        </div>

        <div className="flex items-center gap-2">
          {alerts.some(a => !a.acknowledged) && (
            <Button
              variant="outline"
              size="sm"
              icon={Check}
              onClick={handleAcknowledgeAll}
            >
              Acknowledge All
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            icon={Download}
            onClick={handleExportCSV}
            disabled={filteredAlerts.length === 0}
          >
            Export CSV ({filteredAlerts.length})
          </Button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search child, zone, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Level Filter */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="ALL">All Threat Levels</option>
            <option value="DANGER">DANGER (Critical)</option>
            <option value="WARNING">WARNING (Perimeter)</option>
            <option value="SUPERVISED">SUPERVISED (Adult Present)</option>
            <option value="SAFE">SAFE</option>
          </select>

          {/* Zone Filter */}
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="ALL">All Hazard Types</option>
            <option value="water">Water Tank / Cistern / Pool</option>
            <option value="road">Road / Street Frontage</option>
            <option value="drain">Open Storm Drain / Canal</option>
          </select>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="ALL">All Recorded Dates</option>
            <option value="TODAY">Today Only</option>
            <option value="WEEK">Past 7 Days</option>
          </select>

        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Snapshot</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Target Person</th>
                <th className="py-3 px-4">Hazard Zone</th>
                <th className="py-3 px-4">Severity Level</th>
                <th className="py-3 px-4">Distance</th>
                <th className="py-3 px-4">Speed</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold">No alerts found</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Try clearing your search query or changing active filters.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAlerts.map(alt => (
                  <tr
                    key={alt.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${
                      !alt.acknowledged ? 'bg-rose-50/20 dark:bg-rose-950/20' : ''
                    }`}
                  >
                    {/* Snapshot Thumbnail */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedAlert(alt)}
                        className="group relative w-12 h-9 rounded-lg overflow-hidden bg-slate-950 border border-slate-700 flex items-center justify-center hover:ring-2 hover:ring-cyan-500 transition shrink-0"
                        title="Click to enlarge snapshot"
                      >
                        {alt.snapshot_url ? (
                          <img src={alt.snapshot_url} alt="Alert snapshot" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-tr from-slate-900 to-slate-800 flex items-center justify-center text-slate-500 group-hover:text-cyan-400">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        )}
                        <span className="absolute inset-0 bg-cyan-600/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-[9px] font-bold text-white">
                          VIEW
                        </span>
                      </button>
                    </td>

                    {/* Timestamp */}
                    <td className="py-3 px-4 font-mono whitespace-nowrap text-slate-700 dark:text-slate-300">
                      <div>{formatTimestamp(alt.timestamp)}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(alt.timestamp).toLocaleTimeString()}
                      </div>
                    </td>

                    {/* Target Person */}
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {alt.child_id}
                    </td>

                    {/* Hazard Zone */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {alt.zone_name || 'Hazard Zone'}
                        </span>
                        <HazardBadge type={alt.zone_type || alt.zone} />
                      </div>
                    </td>

                    {/* Level Badge */}
                    <td className="py-3 px-4">
                      <Badge level={alt.level} size="sm" pulse={!alt.acknowledged && alt.level === 'DANGER'} />
                    </td>

                    {/* Distance */}
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {formatDistance(alt.distance_px)}
                    </td>

                    {/* Speed */}
                    <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                      {formatSpeed(alt.speed)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      {alt.acknowledged ? (
                        <span className="text-[11px] text-slate-400 font-medium inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-500" /> Resolved
                        </span>
                      ) : (
                        <Button
                          variant="safe"
                          size="sm"
                          icon={Check}
                          onClick={() => acknowledgeAlert(alt.id)}
                        >
                          Ack
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info bar */}
        <div className="p-3 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex items-center justify-between">
          <span>Showing {filteredAlerts.length} of {alerts.length} total records</span>
          <span className="font-mono text-[11px]">Database: SafeWatch Mock Store (Auto-synchronized)</span>
        </div>
      </div>

      {/* Snapshot Enlarge Modal */}
      <Modal
        isOpen={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
        title={selectedAlert ? `${selectedAlert.level} Incident Snapshot: ${selectedAlert.child_id}` : ''}
        maxWidth="max-w-2xl"
      >
        {selectedAlert && (
          <div className="space-y-4">
            <div className="aspect-video w-full rounded-xl bg-slate-950 overflow-hidden relative border border-slate-800 flex items-center justify-center">
              {selectedAlert.snapshot_url ? (
                <img src={selectedAlert.snapshot_url} alt="Alert snapshot" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-6 space-y-2">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-950/60 border border-cyan-800 flex items-center justify-center text-cyan-400">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-semibold text-slate-200">
                    High-Res CCTV Frame Archive
                  </p>
                  <p className="text-xs text-slate-400">
                    YOLOv8 Detection Annotation captured at {selectedAlert.distance_px}px proximity
                  </p>
                </div>
              )}
              
              <div className="absolute top-3 right-3">
                <Badge level={selectedAlert.level} size="md" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Hazard Zone:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedAlert.zone_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Target Entity:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedAlert.child_id}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Recorded Distance:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedAlert.distance_px} px</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Approach Velocity:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{selectedAlert.speed} m/s</span>
              </div>
            </div>

            {selectedAlert.notes && (
              <p className="text-xs text-slate-600 dark:text-slate-400 p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/40">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Observation:</span> {selectedAlert.notes}
              </p>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-400 font-mono">
                {new Date(selectedAlert.timestamp).toLocaleString()}
              </span>

              <div className="flex items-center gap-2">
                {!selectedAlert.acknowledged && (
                  <Button
                    variant="safe"
                    size="sm"
                    icon={Check}
                    onClick={() => {
                      acknowledgeAlert(selectedAlert.id);
                      setSelectedAlert(null);
                    }}
                  >
                    Mark Acknowledged
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedAlert(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}

