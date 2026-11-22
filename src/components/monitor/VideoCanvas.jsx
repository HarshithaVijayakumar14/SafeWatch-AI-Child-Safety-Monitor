import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useStream } from '../../context/StreamContext';
import { Badge } from '../common/Badge';
import { distancePointToPolygon, getBoundingBoxFootPoint } from '../../utils/geometry';
import { VisualTracker } from '../../utils/visualTracker';
import { 
  Upload, 
  Camera, 
  Tv, 
  Radio, 
  Crosshair, 
  Play,
  Film,
  AlertTriangle,
  Sparkles
} from 'lucide-react';

export function VideoCanvas({ 
  showZones = true, 
  showBoxes = true, 
  showVectors = true,
  onCaptureSnapshot = null,
  webcamRef = null
}) {
  const { 
    frameData, 
    systemStatus, 
    zones, 
    sourceType, 
    uploadedVideoUrl, 
    uploadedVideoName,
    loadSampleVideo,
    webcamStream, 
    isStreaming, 
    isPaused, 
    demoMode,
    enableDemoMode,
    startWebcam,
    setUploadedVideo,
    moveActor,
    setActorBox,
    updateActorTrack,
    autoApproach,
    toggleAutoApproach,
    isDrawingChildBox,
    setIsDrawingChildBox,
    isVideoTrackingEnabled
  } = useStream();

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const videoPlayerRef = useRef(null);
  const localWebcamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Video playback states
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoError, setVideoError] = useState(null);

  // Mouse dragging & box drawing state
  const isDraggingRef = useRef(false);
  const dragActorIdRef = useRef(null);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const childBoxStartRef = useRef(null);
  const childBoxPreviewRef = useRef(null);
  const [childBoxPreview, setChildBoxPreview] = useState(null);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const [clickIndicator, setClickIndicator] = useState(null);

  // Native internal resolution of detection model
  const V_WIDTH = 680;
  const V_HEIGHT = 480;

  // Real-time Visual Object Tracker for moving video targets
  const trackerRef = useRef(new VisualTracker(V_WIDTH, V_HEIGHT));

  useEffect(() => {
    trackerRef.current.setEnabled(isVideoTrackingEnabled);
  }, [isVideoTrackingEnabled]);

  // Sync webcam stream to video element
  useEffect(() => {
    const el = webcamRef?.current || localWebcamRef.current;
    if (el && webcamStream && sourceType === 'webcam') {
      el.srcObject = webcamStream;
      el.play().catch(e => console.warn('Webcam stream play warning', e));
    }
  }, [webcamStream, webcamRef, sourceType]);

  // Force load and play whenever uploadedVideoUrl changes
  useEffect(() => {
    const video = videoPlayerRef.current;
    if (video && uploadedVideoUrl) {
      setVideoError(null);
      setIsVideoPlaying(false);
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.currentTime = 0.01; // primes the first frame immediately
      video.load();
      trackerRef.current.init(video, 320, 200, 38, 64);
      const p = video.play();
      if (p !== undefined) {
        p.then(() => {
          setIsVideoPlaying(true);
        }).catch(err => {
          console.warn('Autoplay waiting for gesture:', err);
          video.muted = true;
          video.play().then(() => setIsVideoPlaying(true)).catch(() => setIsVideoPlaying(false));
        });
      }
    }
  }, [uploadedVideoUrl]);

  // Sync video play/pause with stream controls
  useEffect(() => {
    if (videoPlayerRef.current) {
      if (isPaused || !isStreaming) {
        videoPlayerRef.current.pause();
      } else {
        videoPlayerRef.current.play().catch(e => console.warn('Video play warning', e));
      }
    }
  }, [isPaused, isStreaming]);

  // Normalization helper
  const getCanvasCoords = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return [0, 0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = V_WIDTH / rect.width;
    const scaleY = V_HEIGHT / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    return [Math.max(0, Math.min(V_WIDTH, x)), Math.max(0, Math.min(V_HEIGHT, y))];
  }, []);

  // Mouse down: check if clicking on any bounding box to start dragging or drawing child box
  const handleMouseDown = (e) => {
    if (sourceType === 'standby' && !uploadedVideoUrl) return;
    const [x, y] = getCanvasCoords(e);
    dragStartPosRef.current = { x, y };

    if (isDrawingChildBox) {
      childBoxStartRef.current = { x, y };
      const preview = { x1: x, y1: y, x2: x, y2: y };
      childBoxPreviewRef.current = preview;
      setChildBoxPreview(preview);
      return;
    }

    if (frameData && frameData.people) {
      const clickedPerson = frameData.people.find(p => {
        const [x1, y1, x2, y2] = p.box;
        return x >= x1 && x <= x2 && y >= y1 && y <= y2;
      });

      if (clickedPerson) {
        isDraggingRef.current = true;
        dragActorIdRef.current = clickedPerson.id;
        setIsDraggingState(true);
        return;
      }
    }

    isDraggingRef.current = false;
    dragActorIdRef.current = null;
  };

  const handleMouseMove = (e) => {
    const [x, y] = getCanvasCoords(e);

    if (isDrawingChildBox && childBoxStartRef.current) {
      const preview = {
        x1: childBoxStartRef.current.x,
        y1: childBoxStartRef.current.y,
        x2: x,
        y2: y
      };
      childBoxPreviewRef.current = preview;
      setChildBoxPreview(preview);
      return;
    }

    if (isDraggingRef.current && dragActorIdRef.current) {
      moveActor(dragActorIdRef.current, x, y);
    }
  };

  const handleMouseUp = (e) => {
    const [x, y] = getCanvasCoords(e);

    if (isDrawingChildBox && childBoxStartRef.current) {
      const x1 = Math.min(childBoxStartRef.current.x, x);
      const y1 = Math.min(childBoxStartRef.current.y, y);
      const w = Math.abs(x - childBoxStartRef.current.x);
      const h = Math.abs(y - childBoxStartRef.current.y);

      if (w > 18 && h > 25) {
        setActorBox(4, x1, y1, w, h);
        if (videoPlayerRef.current) {
          trackerRef.current.init(videoPlayerRef.current, x1, y1, w, h);
        }
        setClickIndicator({ x: x1 + w / 2, y: y1 + h, timestamp: Date.now() });
        setTimeout(() => setClickIndicator(null), 1500);
      }
      childBoxStartRef.current = null;
      childBoxPreviewRef.current = null;
      setChildBoxPreview(null);
      setIsDrawingChildBox(false);
      return;
    }

    const distMoved = Math.hypot(x - dragStartPosRef.current.x, y - dragStartPosRef.current.y);

    if (isDraggingRef.current) {
      if (dragActorIdRef.current === 4 && videoPlayerRef.current) {
        trackerRef.current.init(videoPlayerRef.current, x - 19, y - 64, 38, 64);
      }
      isDraggingRef.current = false;
      dragActorIdRef.current = null;
      setIsDraggingState(false);
    } else if (distMoved < 8) {
      // Direct click: place Child-01
      moveActor(4, x, y);
      if (videoPlayerRef.current) {
        trackerRef.current.init(videoPlayerRef.current, x - 19, y - 64, 38, 64);
      }
      setClickIndicator({ x, y, timestamp: Date.now() });
      setTimeout(() => setClickIndicator(null), 1200);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedVideo(file);
    }
  };

  // Render loop on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId;

    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, V_WIDTH, V_HEIGHT);

      // ONLY draw the simulated backdrop if user explicitly selected Simulated Demo Mode!
      if (sourceType === 'simulated' && demoMode) {
        drawSimulatedEnvironment(ctx, V_WIDTH, V_HEIGHT);
      }

      // If in standby with no video, do not draw simulated environment
      if (sourceType === 'standby' && !uploadedVideoUrl) {
        animId = requestAnimationFrame(render);
        return;
      }

      // 0. Update Live Visual Object Tracker on Uploaded Video
      if (
        sourceType === 'upload' &&
        videoPlayerRef.current &&
        isVideoPlaying &&
        !videoPlayerRef.current.paused &&
        isVideoTrackingEnabled &&
        !autoApproach &&
        !isDraggingRef.current &&
        !childBoxStartRef.current
      ) {
        const trackResult = trackerRef.current.update(videoPlayerRef.current);
        if (trackResult && trackResult.changed) {
          updateActorTrack(
            4,
            trackResult.x,
            trackResult.y,
            trackResult.width,
            trackResult.height,
            trackResult.vx,
            trackResult.vy
          );
        }
      }

      // 1. Draw Hazard Zones
      if (showZones && zones) {
        zones.forEach(zone => {
          if (!zone.enabled || !zone.polygon || zone.polygon.length < 3) return;
          drawPolygonZone(ctx, zone);
        });
      }

      // 1.5 Draw Motion Trajectory Breadcrumbs on Uploaded Video if showVectors is on
      if (showVectors && sourceType === 'upload' && trackerRef.current) {
        const breadcrumbs = trackerRef.current.getBreadcrumbs(14);
        if (breadcrumbs && breadcrumbs.length > 1) {
          ctx.save();
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
          ctx.lineWidth = 2;
          ctx.setLineDash([3, 4]);
          ctx.moveTo(breadcrumbs[0][0], breadcrumbs[0][1]);
          for (let i = 1; i < breadcrumbs.length; i++) {
            ctx.lineTo(breadcrumbs[i][0], breadcrumbs[i][1]);
          }
          ctx.stroke();

          // Motion nodes
          breadcrumbs.forEach(([bx, by], idx) => {
            const alpha = (idx + 1) / breadcrumbs.length;
            ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.9})`;
            ctx.beginPath();
            ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.restore();
        }
      }

      // 2. Draw People Detections and Distance Vectors
      if (frameData && frameData.people && isStreaming && !isPaused) {
        const adult = frameData.people.find(p => !p.is_child);
        const adultFoot = adult ? getBoundingBoxFootPoint(adult.box) : null;

        frameData.people.forEach(person => {
          const footPoint = getBoundingBoxFootPoint(person.box);

          // Draw proximity vector to nearest zone
          if (showVectors && person.is_child && zones) {
            let minDistance = Infinity;
            let targetPoint = null;
            let targetZoneColor = '#f59e0b';

            zones.forEach(z => {
              if (!z.enabled || !z.polygon || z.polygon.length < 3) return;
              const { distance, closestPoint } = distancePointToPolygon(footPoint, z.polygon);
              if (distance < minDistance) {
                minDistance = distance;
                targetPoint = closestPoint;
                targetZoneColor = z.color || '#f59e0b';
              }
            });

            if (targetPoint && minDistance < 220) {
              drawDistanceVector(ctx, footPoint, targetPoint, person.level, minDistance);
            }

            // Draw link to guardian adult if supervised
            if (person.level === 'SUPERVISED' && adultFoot) {
              drawGuardianLink(ctx, footPoint, adultFoot);
            }
          }

          // Draw Bounding Box
          if (showBoxes) {
            drawBoundingBox(ctx, person, person.id === dragActorIdRef.current);
          }
        });
      }

      // 3. Draw Click-to-Test Marker
      if (clickIndicator) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(clickIndicator.x, clickIndicator.y, 16, 0, Math.PI * 2);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(clickIndicator.x, clickIndicator.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();
        ctx.font = '10px monospace';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('CHILD TAGGED', clickIndicator.x + 10, clickIndicator.y - 10);
        ctx.restore();
      }

      // 3.5 Draw Child Bounding Box Preview during drag
      const curPreview = childBoxPreviewRef.current || childBoxPreview;
      if (curPreview) {
        const bx1 = Math.min(curPreview.x1, curPreview.x2);
        const by1 = Math.min(curPreview.y1, curPreview.y2);
        const bw = Math.abs(curPreview.x2 - curPreview.x1);
        const bh = Math.abs(curPreview.y2 - curPreview.y1);

        ctx.save();
        ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
        ctx.fillRect(bx1, by1, bw, bh);
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(bx1, by1, bw, bh);

        ctx.fillStyle = '#06b6d4';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.fillText(`CHILD BOUNDING BOX (${Math.round(bw)} × ${Math.round(bh)})`, bx1 + 4, by1 - 6);
        ctx.restore();
      }

      // 4. Draw High-Tech On-Screen Display (OSD)
      drawOSD(ctx, V_WIDTH, V_HEIGHT, frameData, systemStatus, sourceType, uploadedVideoName);

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [zones, frameData, showZones, showBoxes, showVectors, sourceType, uploadedVideoUrl, uploadedVideoName, webcamStream, isStreaming, isPaused, systemStatus, clickIndicator, demoMode, isVideoTrackingEnabled, autoApproach, isVideoPlaying, updateActorTrack]);

  // Method to snapshot current video + canvas frame
  useEffect(() => {
    if (onCaptureSnapshot) {
      onCaptureSnapshot.current = () => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        return canvas.toDataURL('image/jpeg', 0.85);
      };
    }
  }, [onCaptureSnapshot]);

  return (
    <div 
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      title={sourceType === 'upload' ? 'Click or drag Child-01 near the hazard zone to test real-time alerts' : 'Camera Feed Area'}
      className={`relative w-full aspect-[4/3] sm:aspect-[16/10] md:aspect-[16/9] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex items-center justify-center select-none ${
        isDraggingState ? 'cursor-grabbing' : sourceType === 'upload' ? 'cursor-crosshair' : 'cursor-default'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Standby UI (Shown when no feed is selected and demo is not running) */}
      {sourceType === 'standby' && !uploadedVideoUrl && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-4">
            <Radio className="w-7 h-7 text-cyan-400 animate-pulse" />
          </div>
          <h3 className="text-base font-bold text-white mb-1.5">
            SafeWatch Monitor — Feed Standby
          </h3>
          <p className="text-xs text-slate-400 max-w-md mb-6">
            The simulated demo video is stopped. Select a live feed source to start child hazard monitoring:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500 text-left transition group shadow-sm flex flex-col justify-between"
            >
              <Upload className="w-5 h-5 text-cyan-400 mb-3 group-hover:scale-110 transition-transform" />
              <div>
                <div className="font-semibold text-xs text-white">Upload Video</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Use your custom footage (.mp4)</div>
              </div>
            </button>

            <button
              onClick={startWebcam}
              className="p-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500 text-left transition group shadow-sm flex flex-col justify-between"
            >
              <Camera className="w-5 h-5 text-emerald-400 mb-3 group-hover:scale-110 transition-transform" />
              <div>
                <div className="font-semibold text-xs text-white">Live Webcam</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Stream from web camera</div>
              </div>
            </button>

            <button
              onClick={enableDemoMode}
              className="p-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500 text-left transition group shadow-sm flex flex-col justify-between"
            >
              <Tv className="w-5 h-5 text-amber-400 mb-3 group-hover:scale-110 transition-transform" />
              <div>
                <div className="font-semibold text-xs text-white">Live Demo CCTV</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Start simulated monitoring</div>
              </div>
            </button>
          </div>

          <div className="mt-5">
            <button
              onClick={loadSampleVideo}
              className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 underline font-medium"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Or click here to load built-in sample playground video
            </button>
          </div>
        </div>
      )}

      {/* Underlying Webcam Video */}
      {sourceType === 'webcam' && (
        <video
          ref={webcamRef || localWebcamRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
      )}

      {/* Underlying User Uploaded Video */}
      {sourceType === 'upload' && uploadedVideoUrl && (
        <video
          key={uploadedVideoUrl}
          ref={videoPlayerRef}
          src={uploadedVideoUrl}
          autoPlay
          loop
          muted
          playsInline
          onLoadedMetadata={() => {
            if (videoPlayerRef.current) {
              videoPlayerRef.current.play().then(() => setIsVideoPlaying(true)).catch(() => {});
            }
          }}
          onLoadedData={() => {
            if (videoPlayerRef.current) {
              videoPlayerRef.current.play().then(() => setIsVideoPlaying(true)).catch(() => {});
            }
          }}
          onCanPlay={() => {
            if (videoPlayerRef.current && videoPlayerRef.current.paused) {
              videoPlayerRef.current.play().then(() => setIsVideoPlaying(true)).catch(() => {});
            }
          }}
          onPlay={() => setIsVideoPlaying(true)}
          onPause={() => setIsVideoPlaying(false)}
          onError={(e) => {
            console.error('Video element failed to decode:', e);
            setVideoError('Unable to decode video format. Please ensure it is a standard H.264 MP4 or WebM video.');
          }}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
      )}

      {/* Click-to-Play Overlay if Autoplay is Paused */}
      {sourceType === 'upload' && uploadedVideoUrl && !isVideoPlaying && !videoError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-xs">
          <button
            onClick={() => {
              if (videoPlayerRef.current) {
                videoPlayerRef.current.muted = true;
                videoPlayerRef.current.play().then(() => setIsVideoPlaying(true)).catch(console.error);
              }
            }}
            className="px-6 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2.5 shadow-2xl transition hover:scale-105 animate-pulse"
          >
            <Play className="w-5 h-5 fill-white" />
            Click to Start Video Playback
          </button>
          <span className="text-[11px] text-slate-300 mt-2 font-medium">Browser autoplay paused. Click to begin stream.</span>
        </div>
      )}

      {/* Video Error Message */}
      {videoError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-slate-950/90 text-center">
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 mb-3">
            <AlertTriangle className="w-8 h-8 text-rose-500" />
          </div>
          <h4 className="text-sm font-bold text-white mb-1">Video Decoding Error</h4>
          <p className="text-xs text-slate-400 max-w-sm mb-4">{videoError}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg"
            >
              Choose Another MP4 Video
            </button>
            <button
              onClick={loadSampleVideo}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold shadow-lg"
            >
              Load Built-In Sample Video
            </button>
          </div>
        </div>
      )}

      {/* Computer Vision Canvas Overlay */}
      <canvas
        ref={canvasRef}
        width={V_WIDTH}
        height={V_HEIGHT}
        className="absolute inset-0 w-full h-full object-contain z-10"
      />

      {/* Floating Status Pill on Top Right */}
      {isStreaming && (
        <div className="absolute top-4 right-4 z-20 pointer-events-none">
          <Badge level={systemStatus} size="lg" pulse={systemStatus === 'DANGER'}>
            {systemStatus}
          </Badge>
        </div>
      )}

      {/* Interactive Helper Banner for Uploaded Video */}
      {sourceType === 'upload' && uploadedVideoUrl && (
        <div className="absolute bottom-3 right-3 z-20 pointer-events-none bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-cyan-500/30 text-[11px] text-slate-200 font-sans shadow-lg flex items-center gap-2">
          <Crosshair className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>Click or drag child on video to test zone proximity alert</span>
        </div>
      )}

      {/* Floating Drawing Instruction Banner when Drawing Child Box */}
      {isDrawingChildBox && (
        <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between p-3 rounded-xl bg-slate-900/95 backdrop-blur-md border border-cyan-500 shadow-2xl text-xs text-white animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-bold text-cyan-300">
              Draw Child Box: Click and drag a rectangle over the child in your video frame.
            </span>
          </div>
          <button
            onClick={() => {
              childBoxStartRef.current = null;
              setChildBoxPreview(null);
              setIsDrawingChildBox(false);
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Stream Paused Overlay */}
      {isStreaming && isPaused && (
        <div className="absolute inset-0 z-30 bg-slate-950/75 backdrop-blur-sm flex flex-col items-center justify-center text-white pointer-events-none">
          <div className="p-4 rounded-full bg-white/10 mb-3 animate-pulse">
            <span className="text-sm font-semibold tracking-wider uppercase">
              STREAM PAUSED
            </span>
          </div>
          <p className="text-xs text-slate-400">Click Resume in controls below</p>
        </div>
      )}
    </div>
  );
}

// ----------------- Helper Drawing Functions -----------------

function drawPolygonZone(ctx, zone) {
  const poly = zone.polygon;
  if (!poly || poly.length < 3) return;

  ctx.save();

  // 1. Draw Warning Radius buffer (dashed line outside polygon)
  const warningDist = zone.warning_distance || 75;
  ctx.beginPath();
  poly.forEach(([x, y], idx) => {
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.setLineDash([4, 6]);
  ctx.strokeStyle = zone.color ? `${zone.color}66` : 'rgba(245, 158, 11, 0.4)';
  ctx.lineWidth = warningDist * 0.4;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // 2. Draw Polygon Body
  ctx.setLineDash([]);
  ctx.beginPath();
  poly.forEach(([x, y], idx) => {
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();

  // Semi-transparent fill
  ctx.fillStyle = zone.color ? `${zone.color}2e` : 'rgba(239, 68, 68, 0.2)';
  ctx.fill();

  // Solid perimeter outline
  ctx.strokeStyle = zone.color || '#ef4444';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Label tag at top-left vertex of polygon
  const [firstX, firstY] = poly[0];
  ctx.font = 'bold 11px system-ui, sans-serif';
  const labelText = `ZONE: ${zone.name.toUpperCase()}`;
  const textWidth = ctx.measureText(labelText).width;

  ctx.fillStyle = zone.color || '#0284c7';
  ctx.fillRect(firstX, firstY - 22, textWidth + 14, 20);

  ctx.fillStyle = '#ffffff';
  ctx.fillText(labelText, firstX + 7, firstY - 8);

  ctx.restore();
}

function drawBoundingBox(ctx, person, isBeingDragged) {
  const [x1, y1, x2, y2] = person.box;
  const width = x2 - x1;
  const height = y2 - y1;

  ctx.save();

  const colorMap = {
    SAFE: '#10b981', // green
    WARNING: '#f59e0b', // amber
    DANGER: '#ef4444', // red
    SUPERVISED: '#06b6d4' // teal
  };
  const color = colorMap[person.level] || '#10b981';

  // 1. Box Rectangle
  ctx.strokeStyle = isBeingDragged ? '#ffffff' : color;
  ctx.lineWidth = person.level === 'DANGER' ? 3.5 : 2.5;
  ctx.strokeRect(x1, y1, width, height);

  // 2. High-Tech Corner Brackets
  const cornerLen = Math.min(10, width / 4);
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = isBeingDragged ? '#38bdf8' : color;
  ctx.beginPath();
  // Top-left
  ctx.moveTo(x1, y1 + cornerLen);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x1 + cornerLen, y1);
  // Top-right
  ctx.moveTo(x2 - cornerLen, y1);
  ctx.lineTo(x2, y1);
  ctx.lineTo(x2, y1 + cornerLen);
  // Bottom-left
  ctx.moveTo(x1, y2 - cornerLen);
  ctx.lineTo(x1, y2);
  ctx.lineTo(x1 + cornerLen, y2);
  // Bottom-right
  ctx.moveTo(x2 - cornerLen, y2);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x2, y2 - cornerLen);
  ctx.stroke();

  // 3. Ground Foot Point
  ctx.beginPath();
  ctx.arc((x1 + x2) / 2, y2, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // 4. Label Header Pill
  const roleTag = person.is_child ? 'CHILD' : 'ADULT';
  const infoText = `${person.label} [${roleTag}] - ${person.level}`;
  ctx.font = '600 11px system-ui, sans-serif';
  const textWidth = ctx.measureText(infoText).width;

  ctx.fillStyle = color;
  ctx.fillRect(x1 - 1, y1 - 20, textWidth + 12, 20);

  ctx.fillStyle = '#ffffff';
  ctx.fillText(infoText, x1 + 5, y1 - 6);

  // 5. Distance and Speed sub-badge below box if child
  if (person.is_child && person.distance_px !== undefined) {
    const subText = `${person.distance_px}px to hazard | ${person.speed} m/s`;
    ctx.font = 'bold 10px monospace';
    const subWidth = ctx.measureText(subText).width;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(x1 - 1, y2 + 4, subWidth + 8, 16);
    ctx.fillStyle = color;
    ctx.fillText(subText, x1 + 3, y2 + 16);
  }

  ctx.restore();
}

function drawDistanceVector(ctx, fromPoint, toPoint, level, distance) {
  ctx.save();

  const colorMap = {
    SAFE: '#10b981',
    WARNING: '#f59e0b',
    DANGER: '#ef4444',
    SUPERVISED: '#06b6d4'
  };
  const color = colorMap[level] || '#f59e0b';

  ctx.beginPath();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.moveTo(fromPoint[0], fromPoint[1]);
  ctx.lineTo(toPoint[0], toPoint[1]);
  ctx.stroke();

  // Distance label along mid-point
  const midX = (fromPoint[0] + toPoint[0]) / 2;
  const midY = (fromPoint[1] + toPoint[1]) / 2;
  ctx.font = 'bold 10px monospace';
  const label = `${Math.round(distance)}px`;
  const textWidth = ctx.measureText(label).width;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fillRect(midX - textWidth / 2 - 4, midY - 8, textWidth + 8, 16);

  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(label, midX, midY + 4);

  ctx.restore();
}

function drawGuardianLink(ctx, childFoot, adultFoot) {
  ctx.save();
  ctx.beginPath();
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 1.5;
  ctx.moveTo(childFoot[0], childFoot[1]);
  ctx.lineTo(adultFoot[0], adultFoot[1]);
  ctx.stroke();

  const midX = (childFoot[0] + adultFoot[0]) / 2;
  const midY = (childFoot[1] + adultFoot[1]) / 2;
  ctx.font = '9px monospace';
  ctx.fillStyle = '#06b6d4';
  ctx.fillText('GUARDIAN SUPERVISED', midX - 35, midY - 4);
  ctx.restore();
}

function drawOSD(ctx, width, height, frameData, systemStatus, sourceType, uploadedVideoName) {
  ctx.save();

  // Top Left: Stream Diagnostics
  ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
  ctx.fillRect(12, 12, 240, 50);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(12, 12, 240, 50);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('SAFEWATCH CAM-01 [ACTIVE]', 20, 28);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px monospace';
  const timeStr = new Date().toLocaleTimeString();
  ctx.fillText(`FPS: 29.4 | ${timeStr} | F#${frameData.frame_id || 100}`, 20, 44);

  // Bottom Left: Detection Model Watermark
  const sourceLabel = sourceType === 'upload' 
    ? `CLIP: ${uploadedVideoName || 'custom.mp4'}` 
    : sourceType === 'webcam' 
      ? 'LIVE WEBCAM' 
      : sourceType === 'simulated'
        ? 'DEMO CCTV SIMULATION'
        : 'STANDBY';

  ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
  ctx.fillRect(12, height - 32, 330, 22);
  ctx.fillStyle = '#38bdf8';
  ctx.font = '10px monospace';
  ctx.fillText(`DETECTOR: YOLOv8-Child + DeepSORT [${sourceLabel}]`, 18, height - 17);

  ctx.restore();
}

/**
 * Procedural yard / road / drainage simulated CCTV scene (Only used during explicit Demo Mode)
 */
function drawSimulatedEnvironment(ctx, width, height) {
  ctx.save();

  // Ground lawn / courtyard
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1c2833');
  gradient.addColorStop(0.5, '#2c3e50');
  gradient.addColorStop(1, '#1b2631');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Pavement / road texture lines
  ctx.strokeStyle = '#34495e';
  ctx.lineWidth = 1;
  for (let y = 50; y < height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Simulated water tank pool surface with subtle wave pattern
  ctx.fillStyle = '#0f2942';
  ctx.fillRect(425, 125, 190, 160);
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 3;
  ctx.strokeRect(425, 125, 190, 160);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 12px monospace';
  ctx.fillText('WATER CISTERN (DEMO)', 435, 150);

  // Simulated Road Asphalt at bottom
  ctx.fillStyle = '#17202a';
  ctx.fillRect(40, 360, 600, 110);
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 360, 600, 110);
  ctx.setLineDash([12, 12]);
  ctx.strokeStyle = '#facc15';
  ctx.beginPath();
  ctx.moveTo(50, 415);
  ctx.lineTo(630, 415);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#f97316';
  ctx.fillText('ROADWAY TRAFFIC (DEMO)', 55, 385);

  // Simulated Storm Drain canal on left
  ctx.fillStyle = '#1a1423';
  ctx.fillRect(65, 115, 145, 190);
  ctx.strokeStyle = '#9333ea';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(65, 115, 145, 190);
  ctx.fillStyle = '#c084fc';
  ctx.fillText('DRAIN TRENCH (DEMO)', 75, 140);

  ctx.restore();
}
