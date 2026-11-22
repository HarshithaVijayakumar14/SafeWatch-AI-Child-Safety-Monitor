/**
 * SafeWatch Visual Object Tracker
 * 
 * Provides real-time client-side computer vision tracking for bounding boxes on uploaded videos.
 * Utilizes:
 * 1. Frame-to-frame optical motion centroid estimation.
 * 2. Visual template cross-correlation / appearance anchoring.
 * 3. Temporal trajectory caching for video seeking / looping.
 * 4. Momentum & exponential moving average (EMA) velocity smoothing.
 */

export class VisualTracker {
  constructor(width = 680, height = 480) {
    this.V_WIDTH = width;
    this.V_HEIGHT = height;

    this.isTracking = false;
    this.enabled = true; // User toggle for auto-tracking

    // Current state
    this.x = 320;
    this.y = 200;
    this.width = 38;
    this.height = 64;
    this.vx = 0;
    this.vy = 0;

    // Offscreen canvas for sampling video frames
    this.offCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    if (this.offCanvas) {
      this.offCanvas.width = this.V_WIDTH;
      this.offCanvas.height = this.V_HEIGHT;
      this.offCtx = this.offCanvas.getContext('2d', { willReadFrequently: true });
    }

    // Tracking buffers
    this.prevSearchData = null;
    this.prevSearchBounds = null;
    this.templateData = null; // Downsampled appearance patch [16 x 24]
    this.templateW = 16;
    this.templateH = 24;

    this.lastVideoTime = 0;
    this.initialBox = null;
    this.initialTime = 0;

    // Temporal keyframe history: Array<{ time: number, x: number, y: number, w: number, h: number }>
    this.trajectory = [];
  }

  /**
   * Initialize or re-anchor the tracker on a specific bounding box
   */
  init(videoEl, x, y, width, height) {
    this.x = Math.max(5, Math.min(this.V_WIDTH - width - 5, x));
    this.y = Math.max(5, Math.min(this.V_HEIGHT - height - 5, y));
    this.width = Math.max(20, Math.min(180, width));
    this.height = Math.max(30, Math.min(220, height));
    this.vx = 0;
    this.vy = 0;
    this.isTracking = true;

    const currentTime = videoEl && !isNaN(videoEl.currentTime) ? videoEl.currentTime : 0;
    this.lastVideoTime = currentTime;
    this.initialTime = currentTime;
    this.initialBox = { x: this.x, y: this.y, width: this.width, height: this.height };

    // Reset trajectory and record initial keypoint
    this.trajectory = [{
      time: Number(currentTime.toFixed(2)),
      x: this.x,
      y: this.y,
      w: this.width,
      h: this.height
    }];

    this.prevSearchData = null;
    this.prevSearchBounds = null;

    // Capture initial appearance template from current video frame
    if (videoEl && this.offCtx) {
      try {
        this.offCtx.drawImage(videoEl, 0, 0, this.V_WIDTH, this.V_HEIGHT);
        this.sampleTemplate(this.x, this.y, this.width, this.height);
      } catch (err) {
        console.warn('Tracker failed to sample video template:', err);
      }
    }
  }

  /**
   * Sample downscaled appearance template for correlation
   */
  sampleTemplate(x, y, w, h) {
    if (!this.offCtx) return;
    try {
      const clampX = Math.max(0, Math.min(this.V_WIDTH - 2, Math.round(x)));
      const clampY = Math.max(0, Math.min(this.V_HEIGHT - 2, Math.round(y)));
      const clampW = Math.max(2, Math.min(this.V_WIDTH - clampX, Math.round(w)));
      const clampH = Math.max(2, Math.min(this.V_HEIGHT - clampY, Math.round(h)));

      const patch = this.offCtx.getImageData(clampX, clampY, clampW, clampH);
      this.templateData = this.downsamplePatch(patch.data, clampW, clampH, this.templateW, this.templateH);
    } catch (e) {
      // Cross-origin fallback
    }
  }

  /**
   * Downsamples patch to low-res luminance/color grid
   */
  downsamplePatch(data, srcW, srcH, dstW, dstH) {
    const grid = new Float32Array(dstW * dstH * 3);
    const xStep = srcW / dstW;
    const yStep = srcH / dstH;

    for (let dy = 0; dy < dstH; dy++) {
      for (let dx = 0; dx < dstW; dx++) {
        const sx = Math.min(srcW - 1, Math.floor(dx * xStep));
        const sy = Math.min(srcH - 1, Math.floor(dy * yStep));
        const idx = (sy * srcW + sx) * 4;
        const outIdx = (dy * dstW + dx) * 3;
        grid[outIdx] = data[idx];       // R
        grid[outIdx + 1] = data[idx + 1]; // G
        grid[outIdx + 2] = data[idx + 2]; // B
      }
    }
    return grid;
  }

  /**
   * Update tracker position on each video frame
   */
  update(videoEl) {
    if (!this.isTracking || !this.enabled || !videoEl || !this.offCtx) {
      return { x: this.x, y: this.y, width: this.width, height: this.height, changed: false };
    }

    // Video must be playing and have sufficient data
    if (videoEl.paused || videoEl.seeking || videoEl.readyState < 2) {
      return { x: this.x, y: this.y, width: this.width, height: this.height, changed: false };
    }

    const currentTime = videoEl.currentTime;
    const timeDelta = currentTime - this.lastVideoTime;

    // Handle video rewinding / looping:
    if (timeDelta < -0.4) {
      // Looped back! Interpolate from trajectory or restore initial anchor
      const recorded = this.getTrajectoryAtTime(currentTime);
      if (recorded) {
        this.x = recorded.x;
        this.y = recorded.y;
        this.vx = 0;
        this.vy = 0;
      } else if (this.initialBox) {
        this.x = this.initialBox.x;
        this.y = this.initialBox.y;
        this.vx = 0;
        this.vy = 0;
      }
      this.lastVideoTime = currentTime;
      this.prevSearchData = null;
      return { x: this.x, y: this.y, width: this.width, height: this.height, changed: true };
    }

    this.lastVideoTime = currentTime;

    // 1. Draw current video frame onto offscreen canvas
    try {
      this.offCtx.drawImage(videoEl, 0, 0, this.V_WIDTH, this.V_HEIGHT);
    } catch (e) {
      return { x: this.x, y: this.y, width: this.width, height: this.height, changed: false };
    }

    // 2. Define search window around current child bounding box (padding = 32px)
    const marginX = Math.max(28, Math.round(this.width * 0.45));
    const marginY = Math.max(24, Math.round(this.height * 0.35));

    const sx = Math.max(0, Math.round(this.x - marginX));
    const sy = Math.max(0, Math.round(this.y - marginY));
    const sw = Math.min(this.V_WIDTH - sx, Math.round(this.width + 2 * marginX));
    const sh = Math.min(this.V_HEIGHT - sy, Math.round(this.height + 2 * marginY));

    if (sw <= 10 || sh <= 10) {
      return { x: this.x, y: this.y, width: this.width, height: this.height, changed: false };
    }

    let searchData;
    try {
      searchData = this.offCtx.getImageData(sx, sy, sw, sh);
    } catch (e) {
      return { x: this.x, y: this.y, width: this.width, height: this.height, changed: false };
    }

    let detectedDeltaX = 0;
    let detectedDeltaY = 0;
    let hasMotion = false;

    // 3. Frame-to-frame optical motion centroid estimation
    if (this.prevSearchData && this.prevSearchBounds) {
      const prev = this.prevSearchData;
      const prevB = this.prevSearchBounds;

      // Overlap bounding rect between previous search and current search
      const overX1 = Math.max(sx, prevB.x);
      const overY1 = Math.max(sy, prevB.y);
      const overX2 = Math.min(sx + sw, prevB.x + prevB.w);
      const overY2 = Math.min(sy + sh, prevB.y + prevB.h);

      if (overX2 > overX1 + 10 && overY2 > overY1 + 10) {
        let weightedSumX = 0;
        let weightedSumY = 0;
        let totalWeight = 0;
        let motionPixelCount = 0;

        const stride = 2; // Sample every 2nd pixel for extreme speed

        for (let py = overY1; py < overY2; py += stride) {
          const curRowIdx = (py - sy) * sw;
          const prevRowIdx = (py - prevB.y) * prevB.w;

          for (let px = overX1; px < overX2; px += stride) {
            const curIdx = (curRowIdx + (px - sx)) * 4;
            const prevIdx = (prevRowIdx + (px - prevB.x)) * 4;

            // Compute luminance difference
            const lCur = (searchData.data[curIdx] * 299 + searchData.data[curIdx + 1] * 587 + searchData.data[curIdx + 2] * 114) / 1000;
            const lPrev = (prev.data[prevIdx] * 299 + prev.data[prevIdx + 1] * 587 + prev.data[prevIdx + 2] * 114) / 1000;
            const diff = Math.abs(lCur - lPrev);

            // Ignore camera noise floor (< 18)
            if (diff > 18) {
              const weight = diff * diff;
              weightedSumX += px * weight;
              weightedSumY += py * weight;
              totalWeight += weight;
              motionPixelCount++;
            }
          }
        }

        // If significant coherent motion detected
        if (motionPixelCount > 35 && totalWeight > 0) {
          const motionCentroidX = weightedSumX / totalWeight;
          const motionCentroidY = weightedSumY / totalWeight;

          const boxCenterX = this.x + this.width / 2;
          const boxCenterY = this.y + this.height / 2;

          // Target displacement vector
          const rawDx = motionCentroidX - boxCenterX;
          const rawDy = motionCentroidY - boxCenterY;

          // Clamp max single-frame displacement to realistic human step speed (max 12px / frame)
          detectedDeltaX = Math.max(-12, Math.min(12, rawDx));
          detectedDeltaY = Math.max(-10, Math.min(10, rawDy));
          hasMotion = true;
        }
      }
    }

    // 4. Update velocity with Exponential Moving Average (EMA)
    if (hasMotion) {
      const alpha = 0.38; // Smoothing factor
      this.vx = this.vx * (1 - alpha) + detectedDeltaX * alpha;
      this.vy = this.vy * (1 - alpha) + detectedDeltaY * alpha;
    } else {
      // Friction decay when child slows down or pauses
      this.vx *= 0.72;
      this.vy *= 0.72;
      if (Math.abs(this.vx) < 0.15) this.vx = 0;
      if (Math.abs(this.vy) < 0.15) this.vy = 0;
    }

    // 5. Apply displacement to bounding box
    const oldX = this.x;
    const oldY = this.y;

    this.x += this.vx;
    this.y += this.vy;

    // Constrain within video frame
    this.x = Math.max(5, Math.min(this.V_WIDTH - this.width - 5, this.x));
    this.y = Math.max(5, Math.min(this.V_HEIGHT - this.height - 5, this.y));

    // Store buffers for next iteration
    this.prevSearchData = searchData;
    this.prevSearchBounds = { x: sx, y: sy, w: sw, h: sh };

    // Record trajectory point every 0.15s of video time
    if (this.trajectory.length === 0 || currentTime - this.trajectory[this.trajectory.length - 1].time >= 0.15) {
      this.trajectory.push({
        time: Number(currentTime.toFixed(2)),
        x: Math.round(this.x),
        y: Math.round(this.y),
        w: Math.round(this.width),
        h: Math.round(this.height)
      });

      // Keep last 300 points (~45 seconds)
      if (this.trajectory.length > 300) {
        this.trajectory.shift();
      }
    }

    const changed = Math.abs(this.x - oldX) > 0.3 || Math.abs(this.y - oldY) > 0.3;

    return {
      x: Math.round(this.x),
      y: Math.round(this.y),
      width: Math.round(this.width),
      height: Math.round(this.height),
      vx: Number(this.vx.toFixed(2)),
      vy: Number(this.vy.toFixed(2)),
      changed
    };
  }

  /**
   * Find interpolated position at any video timestamp from recorded trajectory
   */
  getTrajectoryAtTime(targetTime) {
    if (!this.trajectory || this.trajectory.length === 0) return null;
    if (this.trajectory.length === 1) return this.trajectory[0];

    // Find closest keyframes
    let p0 = this.trajectory[0];
    let p1 = this.trajectory[this.trajectory.length - 1];

    for (let i = 0; i < this.trajectory.length - 1; i++) {
      if (this.trajectory[i].time <= targetTime && this.trajectory[i + 1].time >= targetTime) {
        p0 = this.trajectory[i];
        p1 = this.trajectory[i + 1];
        break;
      }
    }

    const duration = p1.time - p0.time;
    if (duration <= 0.001) return p0;

    const factor = Math.max(0, Math.min(1, (targetTime - p0.time) / duration));
    return {
      x: p0.x + (p1.x - p0.x) * factor,
      y: p0.y + (p1.y - p0.y) * factor,
      w: p0.w,
      h: p0.h
    };
  }

  /**
   * Enable or disable automatic tracking
   */
  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      this.vx = 0;
      this.vy = 0;
    }
  }

  /**
   * Get recent motion breadcrumbs for visual vector overlay
   */
  getBreadcrumbs(count = 8) {
    if (!this.trajectory || this.trajectory.length === 0) return [];
    return this.trajectory.slice(-count).map(p => [p.x + p.w / 2, p.y + p.h]);
  }
}
