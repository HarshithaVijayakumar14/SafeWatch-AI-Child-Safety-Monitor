import React from 'react';
import { useAlerts } from '../../context/AlertContext';
import { AlertTriangle, AlertCircle, CheckCircle, Shield, X } from 'lucide-react';
import { formatTimestamp } from '../../utils/formatters';

export function ToastContainer() {
  const { toasts, dismissToast } = useAlerts();

  if (!toasts.length) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.toastId} toast={toast} onDismiss={() => dismissToast(toast.toastId)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const isDanger = toast.level === 'DANGER';
  const isWarning = toast.level === 'WARNING';
  const isSupervised = toast.level === 'SUPERVISED';

  const styles = isDanger
    ? 'border-rose-500 bg-rose-50/95 text-rose-900 dark:bg-rose-950/90 dark:text-rose-100 shadow-rose-500/20'
    : isWarning
    ? 'border-amber-500 bg-amber-50/95 text-amber-900 dark:bg-amber-950/90 dark:text-amber-100 shadow-amber-500/20'
    : isSupervised
    ? 'border-cyan-500 bg-cyan-50/95 text-cyan-900 dark:bg-cyan-950/90 dark:text-cyan-100 shadow-cyan-500/20'
    : 'border-emerald-500 bg-emerald-50/95 text-emerald-900 dark:bg-emerald-950/90 dark:text-emerald-100 shadow-emerald-500/20';

  const Icon = isDanger ? AlertCircle : isWarning ? AlertTriangle : isSupervised ? Shield : CheckCircle;

  return (
    <div
      role="alert"
      className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border-l-4 border shadow-lg backdrop-blur-md transition-all duration-300 animate-in slide-in-from-top-2 ${styles}`}
    >
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wider">
            {toast.level} ALERT
          </p>
          <span className="text-[10px] opacity-75">
            {formatTimestamp(toast.timestamp)}
          </span>
        </div>
        <p className="text-sm font-semibold truncate mt-0.5">
          {toast.child_id || 'Person'} near {toast.zone_name || 'Hazard Zone'}
        </p>
        <p className="text-xs opacity-90 line-clamp-1 mt-0.5">
          {toast.notes || `Distance: ${toast.distance_px}px`}
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 -mr-1 rounded-md transition"
        aria-label="Dismiss alert"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

