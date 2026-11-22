import React, { useRef } from 'react';
import { useStream } from '../../context/StreamContext';
import { Button } from '../common/Button';
import { 
  Play, 
  Pause, 
  Square, 
  Camera, 
  Upload, 
  Tv, 
  Layers, 
  Eye, 
  Compass, 
  Volume2, 
  VolumeX, 
  Footprints,
  UserCheck,
  Crosshair,
  ShieldAlert,
  Film
} from 'lucide-react';

export function StreamControls({
  showZones,
  setShowZones,
  showBoxes,
  setShowBoxes,
  showVectors,
  setShowVectors,
  onTakeSnapshot
}) {
  const {
    isStreaming,
    isPaused,
    startStream,
    pauseStream,
    stopStream,
    sourceType,
    setSourceType,
    uploadedVideoUrl,
    uploadedVideoName,
    setUploadedVideo,
    soundEnabled,
    setSoundEnabled,
    demoMode,
    enableDemoMode,
    disableDemoMode,
    startWebcam,
    stopWebcam,
    isWebcamActive,
    autoApproach,
    toggleAutoApproach,
    toggleActor,
    isDrawingChildBox,
    setIsDrawingChildBox,
    isVideoTrackingEnabled,
    setIsVideoTrackingEnabled
  } = useStream();

  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedVideo(file);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-4">
      
      {/* Primary Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          {!isStreaming || isPaused ? (
            <Button
              variant="safe"
              size="sm"
              icon={Play}
              onClick={startStream}
            >
              {isPaused ? 'Resume Feed' : 'Start Feed'}
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              icon={Pause}
              onClick={pauseStream}
            >
              Pause
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            icon={Square}
            onClick={stopStream}
            disabled={!isStreaming && !isPaused}
          >
            Stop
          </Button>

          {onTakeSnapshot && (
            <Button
              variant="outline"
              size="sm"
              icon={Camera}
              onClick={onTakeSnapshot}
              title="Capture snapshot frame"
            >
              Snapshot
            </Button>
          )}
        </div>

        {/* Source Selector */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              sourceType === 'upload'
                ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            {uploadedVideoName ? 'Change Video' : 'Upload Video'}
          </button>

          <button
            onClick={() => {
              if (isWebcamActive) {
                stopWebcam();
              } else {
                startWebcam();
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              sourceType === 'webcam'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Live Webcam
          </button>

          <button
            onClick={() => {
              if (demoMode && sourceType === 'simulated') {
                disableDemoMode();
              } else {
                enableDemoMode();
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              demoMode && sourceType === 'simulated'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            Live Demo CCTV
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

      </div>

      {/* Uploaded Video Testing Sub-Toolbar (Shown when an uploaded video is active) */}
      {sourceType === 'upload' && uploadedVideoUrl && (
        <div className="p-3 bg-cyan-50/50 dark:bg-cyan-950/20 rounded-xl border border-cyan-200 dark:border-cyan-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Active Footage: <span className="font-mono text-cyan-700 dark:text-cyan-300">{uploadedVideoName || 'Uploaded Video'}</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={isDrawingChildBox ? 'danger' : 'primary'}
              size="sm"
              icon={Crosshair}
              onClick={() => setIsDrawingChildBox(!isDrawingChildBox)}
              title="Click and drag directly on your video to draw a box around the child"
            >
              {isDrawingChildBox ? 'Cancel Child Box' : 'Draw Box on Child'}
            </Button>

            <Button
              variant={isVideoTrackingEnabled ? 'safe' : 'outline'}
              size="sm"
              icon={Crosshair}
              onClick={() => setIsVideoTrackingEnabled(!isVideoTrackingEnabled)}
              title="Automatically tracks and moves the child bounding box with the child moving in the video"
            >
              {isVideoTrackingEnabled ? 'Motion Tracking: ON' : 'Motion Tracking: OFF'}
            </Button>

            <Button
              variant={autoApproach ? 'safe' : 'outline'}
              size="sm"
              icon={Footprints}
              onClick={toggleAutoApproach}
              title="Automatically walk Child-01 towards the nearest hazard zone to test alert triggers"
            >
              {autoApproach ? 'Stop Approach' : 'Simulate Hazard Approach'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={UserCheck}
              onClick={() => toggleActor(1)}
              title="Add or remove Adult Guardian to test Supervised safe state"
            >
              Toggle Guardian Adult
            </Button>
          </div>
        </div>
      )}

      {/* Layer Visibility & Display Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
        <span className="text-slate-500 font-medium flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-cyan-500" />
          Overlay Filters:
        </span>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowZones(!showZones)}
            className={`px-2.5 py-1 rounded-lg border font-medium transition flex items-center gap-1.5 ${
              showZones
                ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800'
                : 'bg-transparent text-slate-400 border-slate-200 dark:border-slate-800'
            }`}
          >
            <Eye className="w-3 h-3" /> Hazard Zones
          </button>

          <button
            onClick={() => setShowBoxes(!showBoxes)}
            className={`px-2.5 py-1 rounded-lg border font-medium transition flex items-center gap-1.5 ${
              showBoxes
                ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800'
                : 'bg-transparent text-slate-400 border-slate-200 dark:border-slate-800'
            }`}
          >
            <Layers className="w-3 h-3" /> Bounding Boxes
          </button>

          <button
            onClick={() => setShowVectors(!showVectors)}
            className={`px-2.5 py-1 rounded-lg border font-medium transition flex items-center gap-1.5 ${
              showVectors
                ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800'
                : 'bg-transparent text-slate-400 border-slate-200 dark:border-slate-800'
            }`}
          >
            <Compass className="w-3 h-3" /> Proximity Vectors
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-2.5 py-1 rounded-lg border font-medium transition flex items-center gap-1.5 ${
              soundEnabled
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            {soundEnabled ? 'Alarm Sound: ON' : 'Alarm Sound: MUTED'}
          </button>
        </div>
      </div>
    </div>
  );
}
