import React, { useState, useRef } from 'react';
import { useStream } from '../context/StreamContext';
import { useAlerts } from '../context/AlertContext';
import { VideoCanvas } from '../components/monitor/VideoCanvas';
import { DetectionList } from '../components/monitor/DetectionList';
import { StreamControls } from '../components/monitor/StreamControls';
import { Badge, HazardBadge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { 
  ShieldCheck, 
  AlertTriangle, 
  AlertCircle, 
  Shield, 
  Video, 
  Layers, 
  Download, 
  Clock, 
  Cpu, 
  Radio, 
  Share2,
  HelpCircle,
  Crosshair,
  Footprints,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

export function LiveMonitorPage() {
  const { 
    systemStatus, 
    frameData, 
    zones, 
    isStreaming, 
    demoMode, 
    sourceType,
    uploadedVideoUrl,
    uploadedVideoName,
    isWebcamActive,
    startWebcam,
    stopWebcam,
    webcamError,
    isBackendConnected
  } = useStream();

  const { addToast } = useAlerts();

  // Overlay layers state
  const [showZones, setShowZones] = useState(true);
  const [showBoxes, setShowBoxes] = useState(true);
  const [showVectors, setShowVectors] = useState(true);

  // Snapshot modal
  const captureSnapshotFn = useRef(null);
  const [snapshotUrl, setSnapshotUrl] = useState(null);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  const handleTakeSnapshot = () => {
    if (captureSnapshotFn.current) {
      const dataUrl = captureSnapshotFn.current();
      if (dataUrl) {
        setSnapshotUrl(dataUrl);
        setIsSnapshotModalOpen(true);
      }
    }
  };

  const statusIcons = {
    SAFE: ShieldCheck,
    WARNING: AlertTriangle,
    DANGER: AlertCircle,
    SUPERVISED: Shield
  };
  const StatusIcon = statusIcons[systemStatus] || ShieldCheck;

  return (
    <div className="space-y-6">
      
      {/* Page Header with Telemetry Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Live Safety Monitor
            </h1>
            <Badge level={systemStatus} size="md" pulse={systemStatus === 'DANGER'}>
              {systemStatus}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time multi-hazard proximity inference & guardian supervision tracking
          </p>
        </div>

        {/* Header Right: Guide Button & Quick Telemetry Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={HelpCircle}
            onClick={() => setIsGuideModalOpen(true)}
            className="border-cyan-300 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 bg-cyan-50/70 dark:bg-cyan-950/40 hover:bg-cyan-100 font-semibold"
          >
            How Child Safety Works
          </Button>

          {/* Quick status bar */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 px-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
            <div className="flex items-center gap-1.5 pr-3 border-r border-slate-200 dark:border-slate-800">
              <Radio className={`w-3.5 h-3.5 ${isBackendConnected ? 'text-emerald-500' : 'text-amber-500'} animate-pulse`} />
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                FPS: {isStreaming ? (frameData.fps ? Number(frameData.fps).toFixed(1) : '20.0') : '0.0'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 pr-3 border-r border-slate-200 dark:border-slate-800">
              <Cpu className="w-3.5 h-3.5 text-cyan-500" />
              <span className="text-slate-600 dark:text-slate-400">
                {isBackendConnected ? 'YOLOv8n + ByteTrack + MobileNetV2' : 'SafeWatch Neural Sim'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-slate-600 dark:text-slate-400">
                {zones.filter(z => z.enabled).length} Active Zones
              </span>
            </div>
          </div>
        </div>
      </div>

      {webcamError && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
          <span>Camera Access: {webcamError}</span>
          <span className="font-semibold">Switched to simulated CCTV playback</span>
        </div>
      )}

      {/* Helper Notification Banner for Uploaded Video Mode */}
      {sourceType === 'upload' && uploadedVideoUrl && (
        <div className="p-3.5 rounded-2xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 text-xs text-cyan-900 dark:text-cyan-200 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-ping" />
            <span className="font-semibold">
              Live Custom Video Active: Click the <span className="underline font-bold">"Draw Box on Child"</span> button below to outline the child, or click & drag them towards the hazard zone to test alarms!
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsGuideModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-cyan-100 dark:bg-cyan-900/60 hover:bg-cyan-200 text-cyan-800 dark:text-cyan-200 font-bold transition flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5" /> Safety Guide
            </button>
            <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 bg-white/60 dark:bg-slate-900/60 px-2 py-0.5 rounded-md border border-cyan-200 dark:border-cyan-800">
              {uploadedVideoName}
            </span>
          </div>
        </div>
      )}

      {/* Main Grid: Left Video Player & Controls, Right Detection Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (8 cols): Video Canvas & Controls */}
        <div className="lg:col-span-8 space-y-4">
          <VideoCanvas
            showZones={showZones}
            showBoxes={showBoxes}
            showVectors={showVectors}
            onCaptureSnapshot={captureSnapshotFn}
          />

          <StreamControls
            showZones={showZones}
            setShowZones={setShowZones}
            showBoxes={showBoxes}
            setShowBoxes={setShowBoxes}
            showVectors={showVectors}
            setShowVectors={setShowVectors}
            onTakeSnapshot={handleTakeSnapshot}
          />
        </div>

        {/* Right Column (4 cols): Detection Sidepanel & Active Hazard Summary */}
        <div className="lg:col-span-4 space-y-4 flex flex-col">
          <div className="flex-1 min-h-[380px]">
            <DetectionList />
          </div>

          {/* Active Hazard Zones Reference */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Active Hazard Zones
              </h4>
              <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold">
                {zones.length} Configured
              </span>
            </div>

            <div className="space-y-2">
              {zones.map(zone => (
                <div
                  key={zone.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: zone.color || '#ef4444' }}
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {zone.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HazardBadge type={zone.type} />
                    <span className="text-[10px] text-slate-400 font-mono">
                      {zone.warning_distance}px
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Snapshot Capture Modal */}
      <Modal
        isOpen={isSnapshotModalOpen}
        onClose={() => setIsSnapshotModalOpen(false)}
        title="Inference Frame Snapshot"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          {snapshotUrl && (
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black">
              <img src={snapshotUrl} alt="Detection Frame Snapshot" className="w-full h-auto object-contain" />
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
            <span>Captured at: {new Date().toLocaleTimeString()}</span>
            <span>Status: {systemStatus}</span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSnapshotModalOpen(false)}
            >
              Close
            </Button>
            {snapshotUrl && (
              <a
                href={snapshotUrl}
                download={`safewatch-snapshot-${Date.now()}.jpg`}
                className="inline-flex"
              >
                <Button
                  variant="primary"
                  size="sm"
                  icon={Download}
                >
                  Download Snapshot
                </Button>
              </a>
            )}
          </div>
        </div>
      </Modal>

      {/* How Child Safety & Hazard Detection Works Guide Modal */}
      <Modal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        title="SafeWatch: How Child Safety & Hazard Detection Works"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-6 text-slate-700 dark:text-slate-300 text-sm">
          
          {/* Concept Overview Callout */}
          <div className="p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 space-y-2">
            <div className="flex items-center gap-2 text-cyan-900 dark:text-cyan-200 font-bold">
              <Sparkles className="w-5 h-5 text-cyan-500" />
              <span>Core Understanding: Hazard Zones vs. Child Detection</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              In safety monitoring, there are two distinct components:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-rose-600 dark:text-rose-400 block mb-1">
                  1. Hazard Zones (Danger Areas)
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  You draw these in the <strong>Hazard Zone Editor</strong> (e.g. Swimming Pool, Road, Balcony, Open Pit). This defines where the child must NOT go.
                </p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-cyan-600 dark:text-cyan-400 block mb-1">
                  2. Child Tracking (Protected Subject)
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  In live cameras, the AI detects people automatically. On your uploaded video, you can draw a bounding box over the child or drag them to test alerts!
                </p>
              </div>
            </div>
          </div>

          {/* Step-by-Step: How to Draw the Child */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-cyan-500" />
              Step-by-Step: How to Draw & Position the Child on Your Video
            </h4>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <span className="w-6 h-6 rounded-full bg-cyan-600 text-white font-bold flex items-center justify-center shrink-0">1</span>
                <div>
                  <strong className="text-slate-800 dark:text-slate-200">Click "Draw Box on Child":</strong>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    When you have your uploaded video active, click the cyan <strong>"Draw Box on Child"</strong> button in the toolbar directly underneath the video player.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <span className="w-6 h-6 rounded-full bg-cyan-600 text-white font-bold flex items-center justify-center shrink-0">2</span>
                <div>
                  <strong className="text-slate-800 dark:text-slate-200">Click & Drag Over the Child:</strong>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Click on the top-left of the child in the video frame and drag your mouse down to their feet. When you release, SafeWatch anchors <code>Child-01 [CHILD]</code> at that exact position.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <span className="w-6 h-6 rounded-full bg-cyan-600 text-white font-bold flex items-center justify-center shrink-0">3</span>
                <div>
                  <strong className="text-slate-800 dark:text-slate-200">Automatic Video Motion Tracking:</strong>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    As your video plays, SafeWatch's optical flow motion tracker automatically moves the child's bounding box along with the child's movement across every video frame! You can toggle this anytime with the <strong>"Motion Tracking: ON/OFF"</strong> button.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <span className="w-6 h-6 rounded-full bg-cyan-600 text-white font-bold flex items-center justify-center shrink-0">4</span>
                <div>
                  <strong className="text-slate-800 dark:text-slate-200">Interactive Drag &amp; Re-Positioning:</strong>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    You can also click anywhere on the video or drag the child's bounding box closer to the hazard zone. Watch the dashed vector line calculate the exact distance in real-time!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <span className="w-6 h-6 rounded-full bg-cyan-600 text-white font-bold flex items-center justify-center shrink-0">5</span>
                <div>
                  <strong className="text-slate-800 dark:text-slate-200">One-Click Test: "Simulate Hazard Approach":</strong>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Click the <strong>"Simulate Hazard Approach"</strong> button in the controls toolbar. Child-01 will automatically walk step-by-step toward the pool/road and trigger the emergency siren!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Safety Alert Thresholds */}
          <div className="space-y-3 pt-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-500" />
              Safety Alert Logic & Thresholds
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  SAFE (&gt; 75px)
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  Child is at a healthy distance from all hazard perimeters. Green bounding box, no alarms.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  WARNING (25px - 75px)
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  Child is approaching perimeter. Amber bounding box, dashed vector line, warning banner.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-300 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                  DANGER (&le; 25px / Inside)
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  Child has breached or entered danger area! Red flash, audible siren sound, incident saved to Alerts.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800 text-xs flex items-center justify-between">
              <span className="font-semibold text-cyan-900 dark:text-cyan-200">
                🛡️ Guardian Supervision Suppression:
              </span>
              <span className="text-slate-600 dark:text-slate-400 max-w-md text-right">
                When an Adult is standing within 60px of the child, the status switches to <strong>SUPERVISED</strong> to avoid false alarms while keeping the guardian notified.
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsGuideModalOpen(false)}
            >
              Got It, Let's Monitor
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}

