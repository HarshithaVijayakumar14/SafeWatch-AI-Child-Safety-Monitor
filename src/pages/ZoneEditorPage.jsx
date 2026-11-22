import React, { useState, useRef } from 'react';
import { useStream } from '../context/StreamContext';
import { api } from '../api/client';
import { ZoneCanvas } from '../components/zone/ZoneCanvas';
import { ZoneConfigModal } from '../components/zone/ZoneConfigModal';
import { HazardBadge, Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  RotateCcw, 
  Layers, 
  ShieldAlert, 
  CheckCircle2,
  Upload,
  Video,
  Camera,
  Film,
  Sparkles,
  HelpCircle
} from 'lucide-react';

export function ZoneEditorPage() {
  const { 
    zones, 
    setZones,
    sourceType,
    setSourceType,
    uploadedVideoUrl,
    uploadedVideoName,
    setUploadedVideo,
    loadSampleVideo,
    webcamStream,
    isWebcamActive,
    startWebcam,
    stopWebcam,
    systemStatus
  } = useStream();

  const [activeZoneId, setActiveZoneId] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
  const fileInputRef = useRef(null);

  // Handle polygon completion from canvas
  const handlePolygonCompleted = (vertices) => {
    const newZone = {
      id: `zone-${Date.now()}`,
      name: `Hazard Zone ${zones.length + 1}`,
      type: 'water',
      polygon: vertices,
      warning_distance: 75,
      danger_distance: 25,
      color: '#0284c7',
      enabled: true,
      description: 'Custom drawn perimeter on video frame'
    };
    setEditingZone(newZone);
    setIsConfigModalOpen(true);
  };

  const handleEditZone = (zone) => {
    setEditingZone(zone);
    setIsConfigModalOpen(true);
  };

  const handleDeleteZone = async (id) => {
    if (confirm('Are you sure you want to delete this hazard zone?')) {
      const updated = zones.filter(z => z.id !== id);
      setZones(updated);
      try {
        await api.deleteZone(id);
      } catch (err) {
        console.error('Delete zone failed', err);
      }
    }
  };

  const handleSaveModalZone = async (updatedZone) => {
    const existingIndex = zones.findIndex(z => z.id === updatedZone.id);
    let newZones;
    if (existingIndex >= 0) {
      newZones = [...zones];
      newZones[existingIndex] = updatedZone;
    } else {
      newZones = [...zones, updatedZone];
    }
    setZones(newZones);
    try {
      await api.saveZone(updatedZone);
      showSuccessNotice(`Hazard zone "${updatedZone.name}" saved & linked to live AI detector.`);
    } catch (err) {
      console.error('Save zone failed', err);
    }
  };

  const handleResetDefaults = async () => {
    if (confirm('Reset all hazard zones to default factory configuration?')) {
      try {
        await api.resetDefaults();
        const loaded = await api.getZones();
        setZones(loaded);
        showSuccessNotice('Reset to default zones: Water Tank, Roadway, and Storm Drain.');
      } catch (err) {
        console.error('Reset failed', err);
      }
    }
  };

  const showSuccessNotice = (msg) => {
    setSaveSuccessMessage(msg);
    setTimeout(() => setSaveSuccessMessage(''), 4500);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedVideo(file);
      showSuccessNotice(`Uploaded video "${file.name}" loaded for zone annotation.`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <Layers className="w-6 h-6 text-cyan-500" />
              Hazard Zone Editor
            </h1>
            <Badge level={systemStatus} size="sm">
              AI: {systemStatus}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Draw custom polygonal hazard zones directly over your uploaded video footage or live camera stream
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RotateCcw}
            onClick={handleResetDefaults}
          >
            Reset Default Presets
          </Button>

          <Button
            variant={isDrawing ? 'secondary' : 'primary'}
            size="sm"
            icon={Plus}
            onClick={() => setIsDrawing(!isDrawing)}
          >
            {isDrawing ? 'Cancel Drawing' : 'Draw New Zone'}
          </Button>
        </div>
      </div>

      {/* Informational Guidance Callout */}
      <div className="p-3.5 rounded-2xl bg-cyan-50/60 dark:bg-cyan-950/30 border border-cyan-200/80 dark:border-cyan-800/60 text-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
          <HelpCircle className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
          <span>
            <strong className="text-cyan-900 dark:text-cyan-200">How safety protection works:</strong> In this editor, you draw the <strong>Hazard Areas to avoid</strong> (e.g. Swimming Pool, Road, Balcony). To outline or position the <strong>Child</strong> on your video and test alerts, switch to the <strong>Live Safety Monitor</strong> and click <strong>"Draw Box on Child"</strong>.
          </span>
        </div>
      </div>

      {/* Feed Source Bar (Switch between Uploaded Video, Webcam, and Simulated Feed) */}
      <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <Video className="w-4 h-4 text-cyan-500" />
            Background Frame Source:
          </span>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => {
                stopWebcam();
                setSourceType('simulated');
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                sourceType === 'simulated'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Simulated Feed
            </button>

            <button
              onClick={() => {
                if (!uploadedVideoUrl) {
                  fileInputRef.current?.click();
                } else {
                  stopWebcam();
                  setSourceType('upload');
                }
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                sourceType === 'upload'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Uploaded Video
            </button>

            <button
              onClick={() => {
                if (isWebcamActive) {
                  stopWebcam();
                  setSourceType('simulated');
                } else {
                  startWebcam();
                }
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                sourceType === 'webcam'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm text-cyan-500'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Webcam
            </button>
          </div>
        </div>

        {/* Video Upload Control Action */}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          {uploadedVideoUrl ? (
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 px-2.5 py-1 rounded-xl text-emerald-800 dark:text-emerald-300">
              <Film className="w-3.5 h-3.5" />
              <span className="font-mono text-[11px] truncate max-w-[160px]" title={uploadedVideoName}>
                {uploadedVideoName || 'Custom Video'}
              </span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="underline hover:text-emerald-900 dark:hover:text-emerald-100 font-semibold text-[11px] ml-1"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={Upload}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload Video Clip (.mp4)
              </Button>
              <button
                onClick={loadSampleVideo}
                className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
              >
                Use Sample Clip
              </button>
            </div>
          )}
        </div>
      </div>

      {saveSuccessMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* Main Grid: Left Canvas, Right Zones List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive Polygon Canvas with underlying Video */}
        <div className="lg:col-span-8">
          <ZoneCanvas
            zones={zones}
            activeZoneId={activeZoneId}
            onSelectZone={setActiveZoneId}
            onPolygonCompleted={handlePolygonCompleted}
            isDrawing={isDrawing}
            setIsDrawing={setIsDrawing}
            sourceType={sourceType}
            uploadedVideoUrl={uploadedVideoUrl}
            webcamStream={webcamStream}
          />
        </div>

        {/* Right Column: Configured Zones List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Active Hazard Zones ({zones.length})
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">
                Live Geofences
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[520px]">
              {zones.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-500" />
                  <p className="font-semibold">No hazard zones defined</p>
                  <p className="mt-1 text-slate-500">
                    Upload your video and click "Freeze Frame & Draw Zone" to draw hazard perimeters.
                  </p>
                </div>
              ) : (
                zones.map(zone => {
                  const isSelected = zone.id === activeZoneId;
                  return (
                    <div
                      key={zone.id}
                      onClick={() => setActiveZoneId(zone.id)}
                      className={`p-3.5 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-50/40 dark:bg-cyan-950/30 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: zone.color || '#ef4444' }}
                          />
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {zone.name}
                          </h4>
                        </div>
                        <HazardBadge type={zone.type} />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 dark:text-slate-400 py-1.5 border-t border-b border-slate-100 dark:border-slate-800/80 my-1.5">
                        <div>
                          <span>Warning Buffer:</span>{' '}
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {zone.warning_distance} px
                          </span>
                        </div>
                        <div>
                          <span>Danger Edge:</span>{' '}
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {zone.danger_distance || 25} px
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span>Vertices:</span>{' '}
                          <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {zone.polygon?.length || 0} Polygon Points
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className={`text-[10px] font-semibold ${zone.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                          {zone.enabled ? '● Active in Pipeline' : '○ Disabled'}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditZone(zone);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition"
                            title="Edit zone properties"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteZone(zone.id);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            title="Delete zone"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Config Modal */}
      <ZoneConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        zone={editingZone}
        onSave={handleSaveModalZone}
      />

    </div>
  );
}
