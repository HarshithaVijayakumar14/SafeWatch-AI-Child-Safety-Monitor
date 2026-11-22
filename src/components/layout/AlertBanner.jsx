import React from 'react';
import { useStream } from '../../context/StreamContext';
import { AlertCircle, Volume2, VolumeX, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AlertBanner() {
  const { systemStatus, frameData, soundEnabled, setSoundEnabled } = useStream();

  if (systemStatus !== 'DANGER') return null;

  // Find which person triggered danger
  const dangerPersons = frameData.people?.filter(p => p.level === 'DANGER') || [];
  const primaryPerson = dangerPersons[0];

  return (
    <div className="bg-rose-600 text-white shadow-lg border-b border-rose-700 animate-pulse-fast select-none">
      <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-1.5 rounded-lg flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-white animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wide uppercase text-xs bg-white text-rose-700 px-2 py-0.5 rounded">
                DANGER ALERT
              </span>
              <p className="font-bold text-sm sm:text-base">
                Critical Breach: {primaryPerson ? `${primaryPerson.label} is inside ${primaryPerson.zone_name || 'Hazard Zone'}` : 'Child near unguarded hazard!'}
              </p>
            </div>
            {primaryPerson && (
              <p className="text-xs text-rose-100 hidden sm:block">
                Distance to hazard edge: {primaryPerson.distance_px}px | Approach speed: {primaryPerson.speed} m/s
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="flex items-center gap-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs px-2.5 py-1.5 rounded-lg transition"
            title={soundEnabled ? 'Mute alarm beep' : 'Enable alarm beep'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Alarm On' : 'Muted'}</span>
          </button>
          
          <Link
            to="/alerts"
            className="bg-white text-rose-700 hover:bg-rose-50 text-xs font-bold px-3 py-1.5 rounded-lg shadow transition"
          >
            View History
          </Link>
        </div>
      </div>
    </div>
  );
}

