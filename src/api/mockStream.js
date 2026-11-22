/**
 * SafeWatch Real-time Stream Simulator & Live Video Inference Manager
 * 
 * Supports:
 * 1. 'standby': idle, no continuous simulation or background alarms.
 * 2. 'simulated': autonomous CCTV simulation with wandering child/adult actors.
 * 3. 'upload': user-uploaded video with interactive child placement, live dragging,
 *    and optional automated hazard approach simulation against user's custom zones.
 * 4. 'webcam': live camera stream overlay.
 */
import { distancePointToPolygon, getBoundingBoxFootPoint } from '../utils/geometry';
import { INITIAL_ZONES, INITIAL_SETTINGS } from '../utils/presets';
import { mockApi } from './mock';

class StreamManager {
  constructor() {
    this.subscribers = new Set();
    this.timer = null;
    this.isRunning = false;
    this.isPaused = false;
    this.frameId = 100;
    this.fps = 15;
    this.zones = [...INITIAL_ZONES];
    this.settings = { ...INITIAL_SETTINGS };
    this.mode = 'standby'; // 'standby' | 'simulated' | 'upload' | 'webcam'
    this.autoApproach = false;

    // Detection actors
    this.actors = [
      {
        id: 4,
        label: 'Child-01',
        is_child: true,
        x: 320,
        y: 200,
        vx: 0,
        vy: 0,
        width: 38,
        height: 64,
        enabled: true,
        isManuallyPositioned: true
      },
      {
        id: 2,
        label: 'Child-02',
        is_child: true,
        x: 180,
        y: 290,
        vx: 0,
        vy: 0,
        width: 36,
        height: 60,
        enabled: false,
        isManuallyPositioned: true
      },
      {
        id: 1,
        label: 'Adult-01 (Guardian)',
        is_child: false,
        x: 230,
        y: 190,
        vx: 0,
        vy: 0,
        width: 48,
        height: 105,
        enabled: false,
        isManuallyPositioned: true
      }
    ];

    this.lastAlertTime = 0;
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'simulated') {
      this.actors[0].isManuallyPositioned = false;
      this.actors[1].enabled = true;
      this.actors[2].enabled = true;
    } else if (mode === 'upload') {
      // In upload mode, Child-01 is placed by user and stays where positioned
      this.actors[0].enabled = true;
      this.actors[0].isManuallyPositioned = true;
      this.autoApproach = false;
    } else if (mode === 'standby') {
      this.stop();
    }
    this.tick();
  }

  setZones(zones) {
    if (Array.isArray(zones)) {
      this.zones = zones;
      this.tick();
    }
  }

  setSettings(settings) {
    if (settings) {
      this.settings = { ...this.settings, ...settings };
    }
  }

  setAutoApproach(enabled) {
    this.autoApproach = Boolean(enabled);
    if (!this.isRunning && enabled) {
      this.start();
    }
  }

  toggleActor(actorId, forcedState) {
    const actor = this.actors.find(a => a.id === actorId);
    if (actor) {
      actor.enabled = typeof forcedState === 'boolean' ? forcedState : !actor.enabled;
      this.tick();
    }
  }

  setActorBox(actorId, x, y, width, height) {
    const actor = this.actors.find(a => a.id === actorId);
    if (actor) {
      actor.x = Math.max(5, Math.min(640, x));
      actor.y = Math.max(5, Math.min(440, y));
      actor.width = Math.max(20, Math.min(180, width));
      actor.height = Math.max(30, Math.min(220, height));
      actor.vx = 0;
      actor.vy = 0;
      actor.enabled = true;
      actor.isManuallyPositioned = true;
      this.autoApproach = false;
      this.tick();
    }
  }

  updateActorTrack(actorId, x, y, width, height, vx = 0, vy = 0) {
    const actor = this.actors.find(a => a.id === actorId);
    if (actor) {
      actor.x = Math.max(5, Math.min(640, x));
      actor.y = Math.max(5, Math.min(440, y));
      if (width && height) {
        actor.width = Math.max(20, Math.min(180, width));
        actor.height = Math.max(30, Math.min(220, height));
      }
      actor.vx = vx;
      actor.vy = vy;
      actor.enabled = true;
      actor.isManuallyPositioned = true;
      this.tick();
    }
  }

  moveActor(actorId, x, y) {
    const actor = this.actors.find(a => a.id === actorId);
    if (actor) {
      actor.x = Math.max(10, Math.min(640, x - actor.width / 2));
      actor.y = Math.max(10, Math.min(440, y - actor.height));
      actor.vx = 0;
      actor.vy = 0;
      actor.enabled = true;
      actor.isManuallyPositioned = true;
      this.autoApproach = false;
      this.tick();
    }
  }

  teleportActor(actorId, x, y) {
    this.moveActor(actorId, x, y);
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  emit(data) {
    this.subscribers.forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.error('Stream subscriber callback error', err);
      }
    });
  }

  start() {
    if (this.isRunning) {
      this.isPaused = false;
      return;
    }
    this.isRunning = true;
    this.isPaused = false;
    this.timer = setInterval(() => this.tick(), 1000 / this.fps);
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    this.isPaused = false;
    this.emit({
      frame_id: this.frameId,
      timestamp: new Date().toISOString(),
      people: [],
      status: 'SAFE',
      fps: 0,
      active_zones_count: this.zones.filter(z => z.enabled).length
    });
  }

  tick() {
    this.frameId++;
    const t = this.frameId * 0.05;

    // In standby mode, emit empty safe payload
    if (this.mode === 'standby' && !this.isRunning) {
      this.emit({
        frame_id: this.frameId,
        timestamp: new Date().toISOString(),
        people: [],
        status: 'SAFE',
        fps: 0,
        active_zones_count: this.zones.filter(z => z.enabled).length
      });
      return;
    }

    // 1. Update actor physics depending on mode
    if (this.mode === 'simulated') {
      this.updateSimulatedPhysics(t);
    } else if (this.mode === 'upload' && this.autoApproach) {
      this.updateAutoApproachPhysics();
    }

    // 2. Compute hazard distances, speeds, adult proximity
    const people = [];
    let systemStatus = 'SAFE';

    // Find adult position for proximity check
    const adultActor = this.actors.find(a => !a.is_child && a.enabled);
    const adultFoot = adultActor ? [adultActor.x + adultActor.width / 2, adultActor.y + adultActor.height] : null;

    const activeActors = this.actors.filter(a => a.enabled);

    for (const actor of activeActors) {
      const box = [
        Math.round(actor.x),
        Math.round(actor.y),
        Math.round(actor.x + actor.width),
        Math.round(actor.y + actor.height)
      ];
      const footPoint = getBoundingBoxFootPoint(box);

      // Distance to nearest active hazard zone
      let minDistance = Infinity;
      let nearestZone = null;

      for (const zone of this.zones) {
        if (!zone.enabled || !zone.polygon || zone.polygon.length < 3) continue;
        const { distance, isInside } = distancePointToPolygon(footPoint, zone.polygon);
        const effectiveDist = isInside ? 0 : distance;
        if (effectiveDist < minDistance) {
          minDistance = effectiveDist;
          nearestZone = zone;
        }
      }

      // Proximity to adult
      let distToAdult = Infinity;
      if (actor.is_child && adultFoot) {
        const dx = footPoint[0] - adultFoot[0];
        const dy = footPoint[1] - adultFoot[1];
        distToAdult = Math.sqrt(dx * dx + dy * dy);
      }

      // Determine individual status level
      let level = 'SAFE';
      const warningThreshold = nearestZone ? (nearestZone.warning_distance || this.settings.warning_distance || 75) : (this.settings.warning_distance || 75);
      const dangerThreshold = nearestZone ? (nearestZone.danger_distance || this.settings.danger_distance || 25) : (this.settings.danger_distance || 25);
      const adultGuardianRadius = this.settings.adult_nearby_distance || 90;

      if (actor.is_child) {
        if (minDistance <= dangerThreshold) {
          level = 'DANGER';
        } else if (minDistance <= warningThreshold) {
          // If adult is within guardian radius, downgrade risk to SUPERVISED!
          if (distToAdult <= adultGuardianRadius) {
            level = 'SUPERVISED';
          } else {
            level = 'WARNING';
          }
        } else if (distToAdult <= adultGuardianRadius) {
          level = 'SAFE';
        }
      }

      // Aggregate system status
      if (level === 'DANGER') {
        systemStatus = 'DANGER';
      } else if (level === 'WARNING' && systemStatus !== 'DANGER') {
        systemStatus = 'WARNING';
      } else if (level === 'SUPERVISED' && systemStatus === 'SAFE') {
        systemStatus = 'SUPERVISED';
      }

      // Approach speed
      const currentSpeed = Math.sqrt(actor.vx * actor.vx + actor.vy * actor.vy) * 0.8;

      people.push({
        id: actor.id,
        label: actor.label,
        box,
        is_child: actor.is_child,
        level,
        zone: nearestZone ? nearestZone.type : null,
        zone_name: nearestZone ? nearestZone.name : null,
        distance_px: Math.round(minDistance),
        speed: Number(currentSpeed.toFixed(1)),
        dist_to_adult: actor.is_child && distToAdult !== Infinity ? Math.round(distToAdult) : null
      });

      // Check if this triggers a new alert event (with cooldown)
      if (level === 'DANGER' && actor.is_child) {
        const now = Date.now();
        const cooldown = (this.settings.alert_cooldown_sec || 15) * 1000;
        if (now - this.lastAlertTime > cooldown) {
          this.lastAlertTime = now;
          this.recordNewAlert(actor, nearestZone, minDistance, currentSpeed);
        }
      }
    }

    // Construct WebSocket stream payload matching the expected backend contract
    const frameData = {
      frame_id: this.frameId,
      timestamp: new Date().toISOString(),
      people,
      status: systemStatus,
      fps: this.isRunning ? this.fps : 0,
      active_zones_count: this.zones.filter(z => z.enabled).length
    };

    this.emit(frameData);
  }

  async recordNewAlert(actor, zone, distance, speed) {
    try {
      const alert = {
        child_id: actor.label,
        person_id: actor.id,
        zone_name: zone ? zone.name : 'Hazard Perimeter',
        zone_type: zone ? zone.type : 'water',
        level: 'DANGER',
        distance_px: Math.round(distance),
        speed: Number(speed.toFixed(1)),
        notes: `Immediate danger alert: ${actor.label} breached hazard perimeter (${Math.round(distance)}px)`,
        timestamp: new Date().toISOString()
      };
      await mockApi.addAlert(alert);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('safewatch-new-alert', { detail: alert }));
      }
    } catch (e) {
      console.warn('Auto alert recording failed', e);
    }
  }

  updateAutoApproachPhysics() {
    const activeZones = this.zones.filter(z => z.enabled && z.polygon && z.polygon.length >= 3);
    const child = this.actors[0];
    if (!child || activeZones.length === 0) return;

    // Find closest active zone to child
    const footPoint = [child.x + child.width / 2, child.y + child.height];
    let nearestZone = activeZones[0];
    let nearestDist = Infinity;
    let targetPoint = null;

    activeZones.forEach(z => {
      const { distance, closestPoint } = distancePointToPolygon(footPoint, z.polygon);
      if (distance < nearestDist) {
        nearestDist = distance;
        nearestZone = z;
        targetPoint = closestPoint;
      }
    });

    if (!targetPoint) return;

    const dx = targetPoint[0] - (child.x + child.width / 2);
    const dy = targetPoint[1] - (child.y + child.height);
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 8) {
      const speed = 1.6;
      child.vx = (dx / dist) * speed;
      child.vy = (dy / dist) * speed;
      child.x += child.vx;
      child.y += child.vy;
    } else {
      // Reached boundary, stop and oscillate slightly
      child.vx = 0;
      child.vy = 0;
    }
  }

  updateSimulatedPhysics(t) {
    const activeZones = this.zones.filter(z => z.enabled && z.polygon && z.polygon.length >= 3);

    let target1X = 390;
    let target1Y = 190;

    if (activeZones.length > 0) {
      const poly = activeZones[0].polygon;
      const cx = poly.reduce((sum, p) => sum + p[0], 0) / poly.length;
      const cy = poly.reduce((sum, p) => sum + p[1], 0) / poly.length;
      target1X = cx + Math.sin(t * 0.4) * 65;
      target1Y = cy + Math.cos(t * 0.3) * 55;
    }

    let target2X = 220;
    let target2Y = 320;

    if (activeZones.length > 1) {
      const poly = activeZones[1].polygon;
      const cx = poly.reduce((sum, p) => sum + p[0], 0) / poly.length;
      const cy = poly.reduce((sum, p) => sum + p[1], 0) / poly.length;
      target2X = cx + Math.cos(t * 0.5) * 75;
      target2Y = cy + Math.sin(t * 0.6) * 45;
    }

    const child1 = this.actors[0];
    if (child1 && !child1.isManuallyPositioned) {
      child1.vx = (target1X - child1.x) * 0.04;
      child1.vy = (target1Y - child1.y) * 0.04;
      child1.x += child1.vx;
      child1.y += child1.vy;
    }

    const child2 = this.actors[1];
    if (child2 && !child2.isManuallyPositioned) {
      child2.vx = (target2X - child2.x) * 0.035;
      child2.vy = (target2Y - child2.y) * 0.035;
      child2.x += child2.vx;
      child2.y += child2.vy;
    }

    const adult = this.actors[2];
    if (adult && child1 && !adult.isManuallyPositioned) {
      const targetAdultX = child1.x - 45 + Math.sin(t * 0.25) * 55;
      const targetAdultY = child1.y - 15 + Math.cos(t * 0.25) * 45;
      adult.vx = (targetAdultX - adult.x) * 0.02;
      adult.vy = (targetAdultY - adult.y) * 0.02;
      adult.x += adult.vx;
      adult.y += adult.vy;
    }
  }
}

export const streamManager = new StreamManager();
