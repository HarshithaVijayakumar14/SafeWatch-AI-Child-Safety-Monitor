import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  ShieldAlert, 
  Video, 
  Shapes, 
  BellRing, 
  BarChart3, 
  Settings, 
  Info, 
  Home, 
  Cpu, 
  X,
  ExternalLink
} from 'lucide-react';
import { useAlerts } from '../../context/AlertContext';
import { useStream } from '../../context/StreamContext';

export function Sidebar({ isOpen, onClose }) {
  const { unreadCount } = useAlerts();
  const { demoMode, isStreaming } = useStream();

  const navItems = [
    { to: '/monitor', label: 'Live Monitor', icon: Video, badge: isStreaming ? 'LIVE' : null },
    { to: '/zones', label: 'Zone Editor', icon: Shapes },
    { to: '/alerts', label: 'Alert History', icon: BellRing, count: unreadCount },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/settings', label: 'Settings', icon: Settings },
    { to: '/about', label: 'About Project', icon: Info },
  ];

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
      isActive
        ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
    }`;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0b132b] text-slate-100 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-slate-950">
              <ShieldAlert className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-tight text-lg text-white font-sans">
                  SafeWatch
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-700/50">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 tracking-wide font-normal">
                An extra pair of eyes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation links */}
        <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider uppercase text-slate-400">
            Monitoring & Controls
          </div>

          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => onClose?.()}
                className={linkClass}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                
                {item.badge && (
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                    {item.badge}
                  </span>
                )}

                {item.count > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white">
                    {item.count > 99 ? '99+' : item.count}
                  </span>
                )}
              </NavLink>
            );
          })}

          <div className="pt-4 px-3 pb-2 text-[11px] font-semibold tracking-wider uppercase text-slate-400">
            Navigation
          </div>

          <NavLink
            to="/"
            onClick={() => onClose?.()}
            className={linkClass}
          >
            <Home className="w-4 h-4 shrink-0" />
            <span className="flex-1">Landing Page</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </NavLink>
        </div>

        {/* System telemetry card */}
        <div className="p-4 border-t border-slate-800 bg-[#070d1e]/60">
          <div className="rounded-xl p-3 bg-slate-900/90 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Model Pipeline
              </span>
              <span className="text-cyan-300 font-mono text-[11px]">YOLOv8 + ByteTrack</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Environment</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {demoMode ? 'Simulation Mode' : 'Backend Connected'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
              <span className="text-slate-400">Project</span>
              <span className="text-slate-400 text-[11px]">IPCV Course Demo</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

