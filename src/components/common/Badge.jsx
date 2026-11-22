import React from 'react';

export function Badge({ 
  level = 'SAFE', 
  size = 'md', 
  pulse = false, 
  children,
  className = '' 
}) {
  const normLevel = (level || 'SAFE').toUpperCase();

  const configs = {
    SAFE: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800',
      dot: 'bg-emerald-500',
      label: 'SAFE'
    },
    WARNING: {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800',
      dot: 'bg-amber-500',
      label: 'WARNING'
    },
    DANGER: {
      bg: 'bg-rose-50 dark:bg-rose-950/50',
      text: 'text-rose-700 dark:text-rose-400',
      border: 'border-rose-200 dark:border-rose-800',
      dot: 'bg-rose-500',
      label: 'DANGER'
    },
    SUPERVISED: {
      bg: 'bg-cyan-50 dark:bg-cyan-950/40',
      text: 'text-cyan-700 dark:text-cyan-400',
      border: 'border-cyan-200 dark:border-cyan-800',
      dot: 'bg-cyan-500',
      label: 'SUPERVISED'
    }
  };

  const current = configs[normLevel] || configs.SAFE;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 font-medium gap-1.5',
    md: 'text-xs px-2.5 py-1 font-semibold gap-2',
    lg: 'text-sm px-3.5 py-1.5 font-bold gap-2.5'
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border transition-all duration-200 ${current.bg} ${current.text} ${current.border} ${sizeClasses[size] || sizeClasses.md} ${className}`}
    >
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${current.dot}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${current.dot}`} />
      </span>
      <span>{children || current.label}</span>
    </span>
  );
}

export function HazardBadge({ type = 'water', className = '' }) {
  const types = {
    water: {
      label: 'Water Tank / Pool',
      bg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
    },
    road: {
      label: 'Road / Street',
      bg: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800'
    },
    drain: {
      label: 'Open Drain',
      bg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
    }
  };

  const config = types[type] || {
    label: type || 'Hazard',
    bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config.bg} ${className}`}>
      {config.label}
    </span>
  );
}

