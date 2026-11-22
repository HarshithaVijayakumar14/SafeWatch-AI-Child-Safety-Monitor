/**
 * SafeWatch Real-time Live Inference Client
 * Connects React frontend to FastAPI Python AI engine over WebSocket (/ws/stream).
 * Transmits video frames from webcam or uploaded video, receives YOLOv8 + ByteTrack + MobileNetV2 detections.
 */
import { WS_STREAM_URL } from '../api/client';

class LiveInferenceClient {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.subscribers = new Set();
    this.statusListeners = new Set();
    this.reconnectTimer = null;
    this.isProcessingFrame = false;
    this.lastFrameTime = 0;
    this.offscreenCanvas = null;
    this.offscreenCtx = null;
    
    // Internal coordinate resolution matching canvas
    this.targetWidth = 680;
    this.targetHeight = 480;
    
    // Auto-connect
    this.connect();
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    // Guard against Mixed Content security error when hosted on HTTPS (e.g. GitHub Pages)
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && WS_STREAM_URL.startsWith('ws://')) {
      console.info('[SafeWatch AI] Running on HTTPS production domain. Local insecure WebSocket (ws://) disabled to prevent Mixed-Content SecurityError.');
      this.isConnected = false;
      this.isConnecting = false;
      this._notifyStatus(false);
      return;
    }

    this.isConnecting = true;
    try {
      this.ws = new WebSocket(WS_STREAM_URL);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.isConnecting = false;
        console.log('[SafeWatch AI] Live Inference WebSocket connected to Python backend:', WS_STREAM_URL);
        this._notifyStatus(true);
      };

      this.ws.onmessage = (event) => {
        this.isProcessingFrame = false;
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong' || data.type === 'reset_ack') {
            return;
          }
          this._notifySubscribers(data);
        } catch (err) {
          console.warn('[SafeWatch AI] Failed to parse WebSocket frame payload:', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.isConnecting = false;
        this.isProcessingFrame = false;
        this._notifyStatus(false);
        this._scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        this.isConnected = false;
        this.isConnecting = false;
        this.isProcessingFrame = false;
        this._notifyStatus(false);
      };
    } catch (e) {
      this.isConnected = false;
      this.isConnecting = false;
      this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  _notifyStatus(status) {
    this.statusListeners.forEach((fn) => {
      try {
        fn(status);
      } catch (e) {
        console.error(e);
      }
    });
  }

  _notifySubscribers(data) {
    this.subscribers.forEach((fn) => {
      try {
        fn(data);
      } catch (e) {
        console.error(e);
      }
    });
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  onStatusChange(callback) {
    this.statusListeners.add(callback);
    callback(this.isConnected);
    return () => this.statusListeners.delete(callback);
  }

  /**
   * Reset backend tracking state when switching sources
   */
  reset() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: 'reset' }));
      } catch (e) {
        console.warn('Failed to send reset:', e);
      }
    }
  }

  /**
   * Capture a video frame from HTML5 <video> and transmit to Python AI engine
   * Throttled to ~15-20 FPS with flow control (waits for previous response)
   */
  sendVideoFrame(videoElement) {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    if (!videoElement || videoElement.readyState < 2 || videoElement.paused || videoElement.ended) {
      return false;
    }

    // Flow control: don't flood websocket if backend is processing
    const now = Date.now();
    if (this.isProcessingFrame && now - this.lastFrameTime < 250) {
      return false;
    }

    // Limit maximum send rate to ~18 FPS (55ms interval)
    if (now - this.lastFrameTime < 55) {
      return false;
    }

    try {
      if (!this.offscreenCanvas) {
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = this.targetWidth;
        this.offscreenCanvas.height = this.targetHeight;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
      }

      const vw = videoElement.videoWidth || this.targetWidth;
      const vh = videoElement.videoHeight || this.targetHeight;

      if (vw === 0 || vh === 0) return false;

      // Draw and scale video frame to offscreen canvas
      this.offscreenCtx.drawImage(videoElement, 0, 0, this.targetWidth, this.targetHeight);
      const base64Data = this.offscreenCanvas.toDataURL('image/jpeg', 0.65);

      this.isProcessingFrame = true;
      this.lastFrameTime = now;

      this.ws.send(JSON.stringify({
        type: 'frame',
        frame: base64Data
      }));

      return true;
    } catch (err) {
      this.isProcessingFrame = false;
      console.warn('[SafeWatch AI] Error capturing video frame:', err);
      return false;
    }
  }
}

export const liveInferenceClient = new LiveInferenceClient();
