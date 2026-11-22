import React, { useState } from 'react';
import { useStream } from '../context/StreamContext';
import { VideoCanvas } from '../components/monitor/VideoCanvas';
import { Badge } from '../components/common/Badge';
import { ShieldAlert, Volume2, VolumeX, Radio, ExternalLink } from 'lucide-react';

export function EmbedMonitorPage() {
  const { systemStatus, frameData, soundEnabled, setSoundEnabled } = useStream();

  const childrenCount = frameData?.people?.filter(p => p.is_child).length || 0;
  const adultsCount = frameData?.people?.filter(p => !p.is_child).length || 0;

  return (
    <div className="w-screen h-screen bg-slate-950 text-white flex flex-col overflow-hidden select-none font-sans">
      
      {/* Danger Banner if Active */}
      {systemStatus === 'DANGER' && (
        <div className="bg-rose-600 text-white text-xs font-bold py-1.5 px-4 flex items-center justify-between animate-pulse-fast border-b border-rose-700">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>CRITICAL HAZARD BREACH DETECTED NEAR UNGUARDED PERIMETER</span>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1 rounded hover:bg-rose-700"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Top Header inside Embed */}
      <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-cyan-500 flex items-center justify-center text-slate-950 font-bold">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-sm tracking-tight text-white">SafeWatch</span>
          <span className="text-[10px] font-mono text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800">
            EMBED
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">Tracked:</span>
            <span className="text-cyan-400 font-semibold">{childrenCount} Children</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300 font-semibold">{adultsCount} Adults</span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            title={soundEnabled ? 'Mute alarm' : 'Enable alarm'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <Badge level={systemStatus} size="sm" pulse={systemStatus === 'DANGER'}>
            {systemStatus}
          </Badge>
        </div>
      </div>

      {/* Center Video & Canvas */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden p-2">
        <div className="w-full h-full max-w-4xl max-h-full flex items-center justify-center">
          <VideoCanvas
            showZones={true}
            showBoxes={true}
            showVectors={true}
          />
        </div>
      </div>

      {/* Footer bar */}
      <div className="px-4 py-1.5 bg-slate-900/90 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Real-time YOLOv8 Computer Vision Pipeline</span>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="hover:text-cyan-400 flex items-center gap-1 transition"
        >
          Open SafeWatch Dashboard <ExternalLink className="w-3 h-3" />
        </a>
      </div>

    </div>
  );
}

