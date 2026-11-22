import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { streamManager } from '../api/mockStream';
import { api, USE_MOCK } from '../api/client';
import { playDangerAlert } from '../utils/audio';
import { generateSyntheticCCTVBlob } from '../utils/sampleVideoGenerator';

const StreamContext = createContext();

export function StreamProvider({ children }) {
  const [frameData, setFrameData] = useState({
    frame_id: 0,
    timestamp: new Date().toISOString(),
    people: [],
    status: 'SAFE',
    fps: 0,
    active_zones_count: 0
  });

  // Default: NO automated background simulation until user explicitly starts it
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [sourceType, setSourceType] = useState('standby'); // 'standby' | 'simulated' | 'upload' | 'webcam'
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState(null);
  const [uploadedVideoName, setUploadedVideoName] = useState(null);
  const [autoApproach, setAutoApproach] = useState(false);
  const [isDrawingChildBox, setIsDrawingChildBox] = useState(false);
  const [isVideoTrackingEnabled, setIsVideoTrackingEnabled] = useState(true);
  const [zones, setZones] = useState([]);
  const [settings, setSettings] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Webcam stream state centralized across all views
  const [webcamStream, setWebcamStream] = useState(null);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState(null);

  const startWebcam = useCallback(async () => {
    try {
      setWebcamError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam is not supported in this browser environment.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      setWebcamStream(stream);
      setIsWebcamActive(true);
      setDemoMode(false);
      setSourceType('webcam');
      setIsStreaming(true);
      setIsPaused(false);
      streamManager.setMode('webcam');
      streamManager.start();
    } catch (err) {
      console.warn('Webcam initialization failed:', err);
      setWebcamError(err.message || 'Camera permission denied or device not found.');
      setIsWebcamActive(false);
    }
  }, []);

  const stopWebcam = useCallback(() => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
    setIsWebcamActive(false);
  }, [webcamStream]);

  // Clean up webcam on unmount
  useEffect(() => {
    return () => {
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [webcamStream]);

  // Unified video upload helper
  const setUploadedVideo = useCallback((fileOrUrl, name) => {
    if (!fileOrUrl) {
      setUploadedVideoUrl(null);
      setUploadedVideoName(null);
      setSourceType('standby');
      setIsStreaming(false);
      streamManager.setMode('standby');
      streamManager.stop();
      return;
    }

    // Stop webcam if active
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
      setIsWebcamActive(false);
    }

    if (typeof fileOrUrl === 'string') {
      setUploadedVideoUrl(fileOrUrl);
      setUploadedVideoName(name || 'Uploaded Video');
    } else if (fileOrUrl instanceof File || fileOrUrl instanceof Blob) {
      const url = URL.createObjectURL(fileOrUrl);
      setUploadedVideoUrl(url);
      setUploadedVideoName(name || fileOrUrl.name || 'custom_footage.mp4');
    }

    setDemoMode(false);
    setSourceType('upload');
    setIsStreaming(true);
    setIsPaused(false);
    streamManager.setMode('upload');
    streamManager.start();
  }, [webcamStream]);

  // Load built-in synthetic CCTV video clip
  const loadSampleVideo = useCallback(async () => {
    try {
      const blob = await generateSyntheticCCTVBlob();
      if (blob) {
        setUploadedVideo(blob, 'sample_cctv_playground.webm');
      }
    } catch (e) {
      console.warn('Synthetic video creation error:', e);
    }
  }, [setUploadedVideo]);

  // Start simulated demo mode on demand
  const enableDemoMode = useCallback(() => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
      setIsWebcamActive(false);
    }
    setDemoMode(true);
    setSourceType('simulated');
    setIsStreaming(true);
    setIsPaused(false);
    streamManager.setMode('simulated');
    streamManager.start();
  }, [webcamStream]);

  // Stop simulated demo mode
  const disableDemoMode = useCallback(() => {
    setDemoMode(false);
    if (uploadedVideoUrl) {
      setSourceType('upload');
      streamManager.setMode('upload');
    } else {
      setSourceType('standby');
      setIsStreaming(false);
      streamManager.setMode('standby');
      streamManager.stop();
    }
  }, [uploadedVideoUrl]);

  // Load zones & settings on initial mount
  useEffect(() => {
    async function loadConfig() {
      try {
        const [loadedZones, loadedSettings] = await Promise.all([
          api.getZones(),
          api.getSettings()
        ]);
        setZones(loadedZones || []);
        setSettings(loadedSettings || {});
        streamManager.setZones(loadedZones || []);
        streamManager.setSettings(loadedSettings || {});
        streamManager.setMode('standby');
      } catch (err) {
        console.warn('Initial config load failed', err);
      }
    }
    loadConfig();
  }, []);

  // Subscribe to stream manager
  useEffect(() => {
    const unsubscribe = streamManager.subscribe((incomingFrame) => {
      setFrameData(incomingFrame);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Audio beep loop if danger is active
  const lastDangerBeep = useRef(0);
  useEffect(() => {
    if (frameData.status === 'DANGER' && soundEnabled && isStreaming && !isPaused) {
      const now = Date.now();
      if (now - lastDangerBeep.current > 1200) { // beep cadence
        lastDangerBeep.current = now;
        playDangerAlert(0.4);
      }
    }
  }, [frameData.status, soundEnabled, isStreaming, isPaused]);

  // Stream controls
  const startStream = useCallback(() => {
    setIsStreaming(true);
    setIsPaused(false);
    if (sourceType === 'standby') {
      if (uploadedVideoUrl) {
        setSourceType('upload');
        streamManager.setMode('upload');
      } else {
        enableDemoMode();
        return;
      }
    }
    streamManager.start();
  }, [sourceType, uploadedVideoUrl, enableDemoMode]);

  const pauseStream = useCallback(() => {
    setIsPaused(true);
    streamManager.pause();
  }, []);

  const stopStream = useCallback(() => {
    setIsStreaming(false);
    setIsPaused(false);
    streamManager.stop();
  }, []);

  const toggleDemoMode = useCallback((val) => {
    const nextVal = typeof val === 'boolean' ? val : !demoMode;
    if (nextVal) {
      enableDemoMode();
    } else {
      disableDemoMode();
    }
  }, [demoMode, enableDemoMode, disableDemoMode]);

  const updateZones = useCallback(async (newZones) => {
    setZones(newZones);
    streamManager.setZones(newZones);
  }, []);

  const updateSettings = useCallback(async (newSettings) => {
    setSettings(newSettings);
    streamManager.setSettings(newSettings);
    if (newSettings.sound_enabled !== undefined) {
      setSoundEnabled(newSettings.sound_enabled);
    }
  }, []);

  const moveActor = useCallback((actorId, x, y) => {
    streamManager.moveActor(actorId, x, y);
  }, []);

  const setActorBox = useCallback((actorId, x, y, width, height) => {
    streamManager.setActorBox(actorId, x, y, width, height);
  }, []);

  const updateActorTrack = useCallback((actorId, x, y, width, height, vx = 0, vy = 0) => {
    streamManager.updateActorTrack(actorId, x, y, width, height, vx, vy);
  }, []);

  const toggleAutoApproach = useCallback(() => {
    setAutoApproach(prev => {
      const next = !prev;
      streamManager.setAutoApproach(next);
      return next;
    });
  }, []);

  const toggleActor = useCallback((actorId, forcedState) => {
    streamManager.toggleActor(actorId, forcedState);
  }, []);

  return (
    <StreamContext.Provider
      value={{
        frameData,
        systemStatus: frameData.status,
        isStreaming,
        isPaused,
        demoMode,
        toggleDemoMode,
        enableDemoMode,
        disableDemoMode,
        sourceType,
        setSourceType,
        uploadedVideoUrl,
        uploadedVideoName,
        setUploadedVideoUrl,
        setUploadedVideo,
        loadSampleVideo,
        webcamStream,
        isWebcamActive,
        webcamError,
        startWebcam,
        stopWebcam,
        zones,
        setZones: updateZones,
        settings,
        setSettings: updateSettings,
        startStream,
        pauseStream,
        stopStream,
        soundEnabled,
        setSoundEnabled,
        moveActor,
        setActorBox,
        updateActorTrack,
        teleportActor: moveActor,
        autoApproach,
        toggleAutoApproach,
        toggleActor,
        isDrawingChildBox,
        setIsDrawingChildBox,
        isVideoTrackingEnabled,
        setIsVideoTrackingEnabled
      }}
    >
      {children}
    </StreamContext.Provider>
  );
}

export function useStream() {
  const ctx = useContext(StreamContext);
  if (!ctx) throw new Error('useStream must be used within StreamProvider');
  return ctx;
}
