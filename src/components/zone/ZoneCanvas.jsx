import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '../common/Button';
import { pointInPolygon } from '../../utils/geometry';
import { 
  Check, 
  X, 
  Undo2, 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  Crosshair, 
  Camera, 
  Info,
  Maximize2
} from 'lucide-react';

export function ZoneCanvas({
  zones = [],
  activeZoneId = null,
  onSelectZone = null,
  onPolygonCompleted = null,
  isDrawing = false,
  setIsDrawing = null,
  sourceType = 'simulated',
  uploadedVideoUrl = null,
  webcamStream = null
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const webcamVideoRef = useRef(null);

  const [currentVertices, setCurrentVertices] = useState([]);
  const [mousePos, setMousePos] = useState(null);

  // Video playback state
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const C_WIDTH = 680;
  const C_HEIGHT = 480;

  const hasVideoSource = (sourceType === 'upload' && !!uploadedVideoUrl) || (sourceType === 'webcam' && !!webcamStream);

  // Sync webcam stream to video element
  useEffect(() => {
    if (webcamVideoRef.current && webcamStream) {
      webcamVideoRef.current.srcObject = webcamStream;
      webcamVideoRef.current.play().catch(e => console.warn('Webcam play error', e));
    }
  }, [webcamStream, sourceType]);

  // Force load and play whenever uploadedVideoUrl changes in Zone Editor
  useEffect(() => {
    const video = videoRef.current;
    if (video && uploadedVideoUrl) {
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.currentTime = 0.01;
      video.load();
      const p = video.play();
      if (p !== undefined) {
        p.then(() => setIsPlaying(true)).catch(err => {
          console.warn('Zone canvas autoplay waiting for user gesture:', err);
          video.muted = true;
          video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        });
      }
    }
  }, [uploadedVideoUrl]);

  // Video time update listener
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const seekVideo = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const stepFrame = (seconds) => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
      videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    }
  };

  // Pause video automatically when user starts drawing
  useEffect(() => {
    if (isDrawing && videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isDrawing]);

  // Coordinate transformation helper (normalizing CSS pixel coordinates to 680x480)
  const getCanvasCoords = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return [0, 0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = C_WIDTH / rect.width;
    const scaleY = C_HEIGHT / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    return [Math.max(0, Math.min(C_WIDTH, x)), Math.max(0, Math.min(C_HEIGHT, y))];
  }, []);

  const handleCanvasClick = (e) => {
    const [x, y] = getCanvasCoords(e);

    if (isDrawing) {
      // If we have at least 3 points and user clicks close to the first point (within 18px), close polygon!
      if (currentVertices.length >= 3) {
        const [firstX, firstY] = currentVertices[0];
        const distToStart = Math.hypot(x - firstX, y - firstY);
        if (distToStart < 18) {
          completePolygon();
          return;
        }
      }
      setCurrentVertices(prev => [...prev, [x, y]]);
    } else {
      // If not drawing, check if clicking on an existing zone to select it
      for (let i = zones.length - 1; i >= 0; i--) {
        const zone = zones[i];
        if (zone.polygon && zone.polygon.length >= 3) {
          if (pointInPolygon([x, y], zone.polygon)) {
            onSelectZone?.(zone.id);
            return;
          }
        }
      }
    }
  };

  const handleMouseMove = (e) => {
    const [x, y] = getCanvasCoords(e);
    setMousePos([x, y]);
  };

  const handleDoubleClick = () => {
    if (isDrawing && currentVertices.length >= 3) {
      completePolygon();
    }
  };

  const completePolygon = () => {
    if (currentVertices.length < 3) return;
    onPolygonCompleted?.(currentVertices);
    setCurrentVertices([]);
    setIsDrawing?.(false);
    setMousePos(null);
  };

  const cancelDrawing = () => {
    setCurrentVertices([]);
    setIsDrawing?.(false);
    setMousePos(null);
  };

  const undoLastPoint = () => {
    setCurrentVertices(prev => prev.slice(0, -1));
  };

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId;

    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, C_WIDTH, C_HEIGHT);

      // If simulated mode without active video/webcam, draw simulated reference frame
      if (!hasVideoSource) {
        drawBackdrop(ctx, C_WIDTH, C_HEIGHT);
      }

      // 1. Draw existing zones
      zones.forEach(zone => {
        if (!zone.polygon || zone.polygon.length < 3) return;
        const isSelected = zone.id === activeZoneId;
        drawExistingZone(ctx, zone, isSelected);
      });

      // 2. Draw currently drawing polygon
      if (isDrawing && currentVertices.length > 0) {
        ctx.save();
        ctx.beginPath();
        currentVertices.forEach(([vx, vy], idx) => {
          if (idx === 0) ctx.moveTo(vx, vy);
          else ctx.lineTo(vx, vy);
        });

        // Rubberband line to mouse
        if (mousePos) {
          ctx.lineTo(mousePos[0], mousePos[1]);
        }

        ctx.strokeStyle = '#06b6d4'; // bright cyan
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 5]);
        ctx.stroke();

        // Semi-fill
        ctx.fillStyle = 'rgba(6, 182, 212, 0.18)';
        ctx.fill();

        // Vertex dots
        ctx.setLineDash([]);
        currentVertices.forEach(([vx, vy], idx) => {
          ctx.beginPath();
          ctx.arc(vx, vy, idx === 0 ? 7 : 4.5, 0, Math.PI * 2);
          ctx.fillStyle = idx === 0 ? '#10b981' : '#06b6d4';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Label first vertex for closing
          if (idx === 0) {
            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 11px system-ui, sans-serif';
            ctx.fillText('CLICK TO CLOSE', vx + 10, vy - 10);
          }
        });

        ctx.restore();
      }

      // 3. Coordinate tooltip during drawing
      if (isDrawing && mousePos) {
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(mousePos[0] + 12, mousePos[1] + 12, 85, 22);
        ctx.fillStyle = '#38bdf8';
        ctx.font = '10px monospace';
        ctx.fillText(`X:${mousePos[0]} Y:${mousePos[1]}`, mousePos[0] + 18, mousePos[1] + 27);
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [zones, activeZoneId, isDrawing, currentVertices, mousePos, hasVideoSource]);

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3">
      {/* Canvas container with video element directly underneath */}
      <div 
        ref={containerRef}
        className="relative aspect-[4/3] sm:aspect-[16/10] md:aspect-[16/9] w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl flex items-center justify-center select-none"
      >
        {/* Underlying User Uploaded Video */}
        {sourceType === 'upload' && uploadedVideoUrl && (
          <video
            key={uploadedVideoUrl}
            ref={videoRef}
            src={uploadedVideoUrl}
            autoPlay
            loop
            muted
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => {
              handleLoadedMetadata();
              if (videoRef.current) {
                videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
              }
            }}
            onLoadedData={() => {
              if (videoRef.current) {
                videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
              }
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />
        )}

        {/* Underlying Live Webcam Feed */}
        {sourceType === 'webcam' && webcamStream && (
          <video
            ref={webcamVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />
        )}

        {/* Interactive Zone Editing Canvas */}
        <canvas
          ref={canvasRef}
          width={C_WIDTH}
          height={C_HEIGHT}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onDoubleClick={handleDoubleClick}
          className={`absolute inset-0 w-full h-full object-contain z-10 ${isDrawing ? 'cursor-crosshair' : 'cursor-pointer'}`}
        />

        {/* Source Watermark / Status Badge */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-[11px] font-mono text-slate-200">
            {sourceType === 'upload' && uploadedVideoUrl ? (
              <span className="text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                CUSTOM VIDEO ACTIVE
              </span>
            ) : sourceType === 'webcam' && webcamStream ? (
              <span className="text-cyan-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                LIVE WEBCAM ACTIVE
              </span>
            ) : (
              <span className="text-slate-400">SIMULATED FEED</span>
            )}
          </div>
        </div>

        {/* Floating Instruction Banner when Drawing */}
        {isDrawing && (
          <div className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-cyan-500/40 text-xs text-white shadow-2xl">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="font-semibold text-cyan-300">
                Drawing Active: Click on video to place hazard perimeter points ({currentVertices.length} placed)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                icon={Undo2}
                onClick={undoLastPoint}
                disabled={currentVertices.length === 0}
              >
                Undo
              </Button>
              <Button
                variant="safe"
                size="sm"
                icon={Check}
                onClick={completePolygon}
                disabled={currentVertices.length < 3}
              >
                Finish Polygon
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={X}
                onClick={cancelDrawing}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Video Playback & Freeze-Frame Controls Bar (Shown when video is loaded) */}
      {sourceType === 'upload' && uploadedVideoUrl && (
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlayPause}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4 text-cyan-500" /> : <Play className="w-4 h-4 text-emerald-500" />}
            </button>

            <button
              onClick={() => stepFrame(-1)}
              className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono text-[11px]"
              title="Rewind 1 second"
            >
              -1s
            </button>
            <button
              onClick={() => stepFrame(1)}
              className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono text-[11px]"
              title="Forward 1 second"
            >
              +1s
            </button>

            <span className="font-mono text-slate-600 dark:text-slate-300 ml-1">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Timeline Seek Scrubber */}
          <div className="flex-1 min-w-[140px] max-w-md mx-2">
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.05"
              value={currentTime}
              onChange={(e) => seekVideo(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
            />
          </div>

          {/* Freeze Frame & Draw Action */}
          <div className="flex items-center gap-2">
            {!isDrawing ? (
              <Button
                variant="primary"
                size="sm"
                icon={Crosshair}
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.pause();
                    setIsPlaying(false);
                  }
                  setIsDrawing?.(true);
                }}
              >
                Freeze Frame & Draw Zone
              </Button>
            ) : (
              <span className="text-cyan-500 font-medium animate-pulse">
                Click video points to define zone
              </span>
            )}
          </div>
        </div>
      )}

      {/* Helper Footer */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-cyan-500" />
          {hasVideoSource 
            ? 'Scrub or pause video at any frame, then click "Freeze Frame & Draw Zone" to draw hazard boundaries directly on your footage.'
            : 'Click on any vertex to define polygon perimeter. Minimum 3 points required.'}
        </span>
        <span className="font-mono text-[11px]">Coordinate Space: 680 × 480 px</span>
      </div>
    </div>
  );
}

function drawBackdrop(ctx, width, height) {
  // Slate dark grid CCTV backdrop
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(1, '#1e293b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Visual cues for default hazards
  ctx.fillStyle = 'rgba(2, 132, 199, 0.15)';
  ctx.fillRect(425, 125, 190, 160);
  ctx.strokeStyle = 'rgba(2, 132, 199, 0.4)';
  ctx.strokeRect(425, 125, 190, 160);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '10px monospace';
  ctx.fillText('Water Reservoir Area', 435, 145);

  ctx.fillStyle = 'rgba(234, 88, 12, 0.12)';
  ctx.fillRect(40, 360, 600, 110);
  ctx.strokeStyle = 'rgba(234, 88, 12, 0.4)';
  ctx.strokeRect(40, 360, 600, 110);
  ctx.fillText('Roadway Traffic Area', 50, 380);

  ctx.fillStyle = 'rgba(124, 58, 237, 0.12)';
  ctx.fillRect(65, 115, 145, 190);
  ctx.strokeStyle = 'rgba(124, 58, 237, 0.4)';
  ctx.strokeRect(65, 115, 145, 190);
  ctx.fillText('Storm Drainage Trench', 75, 135);
}

function drawExistingZone(ctx, zone, isSelected) {
  const poly = zone.polygon;
  ctx.save();

  // Warning buffer line
  const warningDist = zone.warning_distance || 75;
  ctx.beginPath();
  poly.forEach(([x, y], idx) => {
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.setLineDash([4, 6]);
  ctx.strokeStyle = zone.color ? `${zone.color}55` : 'rgba(245, 158, 11, 0.3)';
  ctx.lineWidth = warningDist * 0.4;
  ctx.stroke();

  // Polygon fill
  ctx.setLineDash([]);
  ctx.beginPath();
  poly.forEach(([x, y], idx) => {
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = zone.color ? `${zone.color}${isSelected ? '50' : '28'}` : 'rgba(239, 68, 68, 0.2)';
  ctx.fill();

  // Outline
  ctx.strokeStyle = isSelected ? '#ffffff' : (zone.color || '#ef4444');
  ctx.lineWidth = isSelected ? 3.5 : 2;
  ctx.stroke();

  // Vertices
  poly.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, isSelected ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fillStyle = isSelected ? '#ffffff' : (zone.color || '#ef4444');
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // Label
  const [firstX, firstY] = poly[0];
  ctx.font = 'bold 11px system-ui, sans-serif';
  const label = `${zone.name} (${zone.warning_distance}px)`;
  const width = ctx.measureText(label).width;

  ctx.fillStyle = zone.color || '#0284c7';
  ctx.fillRect(firstX, firstY - 22, width + 14, 20);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(label, firstX + 7, firstY - 8);

  ctx.restore();
}
