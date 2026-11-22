import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, 
  Sun, 
  Moon, 
  Bell, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Radio, 
  Check, 
  Trash2, 
  ExternalLink 
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAlerts } from '../../context/AlertContext';
import { useStream } from '../../context/StreamContext';
import { Badge } from '../common/Badge';
import { formatTimestamp } from '../../utils/formatters';
import { Link } from 'react-router-dom';

export function Topbar({ onMenuClick }) {
  const { theme, toggleTheme } = useTheme();
  const { alerts, unreadCount, acknowledgeAlert, clearAllAlerts } = useAlerts();
  const { 
    demoMode, 
    toggleDemoMode, 
    soundEnabled, 
    setSoundEnabled, 
    isStreaming, 
    isPaused, 
    pauseStream, 
    startStream 
  } = useStream();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close notifications dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const recentAlerts = alerts.slice(0, 5);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        
        {/* Left: Mobile hamburger & Connection indicator */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            aria-label="Open sidebar navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Connection Status Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-200 hidden sm:inline">
              {demoMode ? 'Demo Mode' : 'Connected'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
              (Live AI Detection)
            </span>
          </div>
        </div>

        {/* Right: Controls & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Demo Mode Toggle Switch */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <Radio className={`w-3.5 h-3.5 ${demoMode ? 'text-cyan-500 animate-pulse' : 'text-slate-400'}`} />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 hidden md:inline">
              Simulation
            </span>
            <button
              onClick={() => toggleDemoMode()}
              role="switch"
              aria-checked={demoMode}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                demoMode ? 'bg-cyan-600' : 'bg-slate-300 dark:bg-slate-600'
              }`}
              title="Toggle Live Demo Simulation"
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  demoMode ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Sound Mute/Unmute */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition"
            title={soundEnabled ? 'Mute alert sounds' : 'Enable alert sounds'}
            aria-label="Toggle alert sounds"
          >
            {soundEnabled ? (
              <Volume2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            ) : (
              <VolumeX className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {/* Notification Bell Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition"
              aria-label="View recent alerts"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Drawer Popover */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in-50 zoom-in-95">
                <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      Recent Alerts
                    </span>
                    {unreadCount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-semibold">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                  {alerts.length > 0 && (
                    <button
                      onClick={clearAllAlerts}
                      className="text-xs text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 transition"
                      title="Clear alert list"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Clear
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                  {recentAlerts.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No alerts recorded yet. System is safe.
                    </div>
                  ) : (
                    recentAlerts.map(alt => (
                      <div 
                        key={alt.id}
                        className={`p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition flex items-start gap-3 ${
                          !alt.acknowledged ? 'bg-rose-50/20 dark:bg-rose-950/20' : ''
                        }`}
                      >
                        <Badge level={alt.level} size="sm" pulse={!alt.acknowledged} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {alt.child_id} - {alt.zone_name}
                            </p>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap ml-1">
                              {formatTimestamp(alt.timestamp)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {alt.notes || `Distance: ${alt.distance_px}px`}
                          </p>
                        </div>
                        {!alt.acknowledged && (
                          <button
                            onClick={() => acknowledgeAlert(alt.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition shrink-0"
                            title="Acknowledge alert"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-center">
                  <Link
                    to="/alerts"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1"
                  >
                    View All Alert History <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Dark / Light Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-slate-600" />
            )}
          </button>
        </div>

      </div>
    </header>
  );
}

