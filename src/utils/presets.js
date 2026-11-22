/**
 * Default Preset Zones and Mock Data for SafeWatch
 */

export const INITIAL_ZONES = [
  {
    id: 'zone-1',
    name: 'Open Water Tank / Pool',
    type: 'water',
    polygon: [
      [420, 120],
      [600, 130],
      [620, 290],
      [430, 280]
    ],
    warning_distance: 75, // pixels
    danger_distance: 25,
    color: '#0284c7', // Sky blue
    enabled: true,
    description: 'Underground cistern & outdoor water tank perimeter'
  },
  {
    id: 'zone-2',
    name: 'Main Road Frontage',
    type: 'road',
    polygon: [
      [40, 360],
      [640, 350],
      [640, 470],
      [40, 470]
    ],
    warning_distance: 85,
    danger_distance: 30,
    color: '#f97316', // Orange
    enabled: true,
    description: 'Unfenced property border facing active two-lane vehicular street'
  },
  {
    id: 'zone-3',
    name: 'Open Storm Drain Trench',
    type: 'drain',
    polygon: [
      [60, 110],
      [180, 110],
      [220, 310],
      [80, 310]
    ],
    warning_distance: 65,
    danger_distance: 20,
    color: '#9333ea', // Purple
    enabled: true,
    description: 'Uncovered municipal concrete rainwater culvert'
  }
];

export const INITIAL_SETTINGS = {
  warning_distance: 75,
  danger_distance: 25,
  adult_nearby_distance: 90, // If adult is within 90px of child, state becomes SUPERVISED
  approach_speed_threshold: 1.5, // m/s
  alert_cooldown_sec: 15,
  telegram_token: '',
  telegram_chat_id: '',
  sound_enabled: true,
  sound_volume: 0.5,
  theme: 'light',
  auto_snapshot: true
};

export const INITIAL_ALERTS = [
  {
    id: 'alt-101',
    timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    child_id: 'Child-04',
    person_id: 4,
    zone_name: 'Open Water Tank / Pool',
    zone_type: 'water',
    level: 'DANGER',
    distance_px: 12,
    speed: 1.8,
    acknowledged: false,
    snapshot_url: null,
    notes: 'Child rapidly approached cistern edge without guardian'
  },
  {
    id: 'alt-102',
    timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    child_id: 'Child-02',
    person_id: 2,
    zone_name: 'Main Road Frontage',
    zone_type: 'road',
    level: 'WARNING',
    distance_px: 54,
    speed: 1.3,
    acknowledged: true,
    snapshot_url: null,
    notes: 'Child within warning perimeter of street curb'
  },
  {
    id: 'alt-103',
    timestamp: new Date(Date.now() - 52 * 60 * 1000).toISOString(),
    child_id: 'Child-04',
    person_id: 4,
    zone_name: 'Open Storm Drain Trench',
    zone_type: 'drain',
    level: 'SUPERVISED',
    distance_px: 38,
    speed: 0.6,
    acknowledged: true,
    snapshot_url: null,
    notes: 'Child near open drain; adult guardian detected at 42px'
  },
  {
    id: 'alt-104',
    timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    child_id: 'Child-01',
    person_id: 1,
    zone_name: 'Open Water Tank / Pool',
    zone_type: 'water',
    level: 'DANGER',
    distance_px: 8,
    speed: 2.1,
    acknowledged: true,
    snapshot_url: null,
    notes: 'Immediate danger: Child reached perimeter edge'
  },
  {
    id: 'alt-105',
    timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    child_id: 'Child-03',
    person_id: 3,
    zone_name: 'Main Road Frontage',
    zone_type: 'road',
    level: 'WARNING',
    distance_px: 62,
    speed: 1.1,
    acknowledged: true,
    snapshot_url: null,
    notes: 'Ball rolled toward street, child walked after it'
  },
  {
    id: 'alt-106',
    timestamp: new Date(Date.now() - 7 * 3600 * 1000).toISOString(),
    child_id: 'Child-02',
    person_id: 2,
    zone_name: 'Open Storm Drain Trench',
    zone_type: 'drain',
    level: 'WARNING',
    distance_px: 48,
    speed: 1.0,
    acknowledged: true,
    snapshot_url: null,
    notes: 'Playing near storm trench without supervision'
  }
];

