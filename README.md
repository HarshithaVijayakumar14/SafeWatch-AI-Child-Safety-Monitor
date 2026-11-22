# SafeWatch: AI Child Safety Monitor (Frontend)

> **"An extra pair of eyes"** — Web dashboard and computer vision surveillance system detecting children approaching dangerous, unguarded hazard zones (open water cisterns, municipal drainage trenches, and roadway traffic).

Developed for **Image Processing and Computer Vision (IPCV)** Course Project.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher

### 2. Installation
```bash
# Clone or navigate to the repository directory
cd IPCV

# Install all dependencies
npm install
```

### 3. Run Development Server
```bash
npm run dev
```

The application will start immediately at:
👉 **[http://localhost:3000](http://localhost:3000)** (or your local IP)

To create an optimized production build:
```bash
npm run build
npm run preview
```

---

## 🎨 Design System & Status Palette

Status levels are color-coded consistently across all bounding boxes, polygon layers, alert badges, and telemetry charts:

| State | Color Code | Tailwind Color | Meaning & Trigger |
| :--- | :--- | :--- | :--- |
| **SAFE** | `#10b981` | Emerald Green | Child is at a safe distance (> warning perimeter) |
| **WARNING** | `#f59e0b` | Amber Gold | Child entered warning buffer perimeter without guardian |
| **DANGER** | `#ef4444` | Crimson Red | Child reached critical danger edge (< danger threshold) |
| **SUPERVISED** | `#06b6d4` | Teal / Cyan | Verified adult guardian within proximity radius (false alarm suppression) |

---

## 🖥️ Application Pages

1. **Landing Page (`/`)**:
   - Problem statement highlighting child drowning risks in open sumps and traffic accidents.
   - 4-step interactive pipeline (*Camera Stream → Pediatric Detection → Hazard Geometry → Instant Alert*).
   - Core capability cards (*Adult-Nearby verification, Approach-speed calculation, Telegram Bot integration, Arbitrary Polygon Zones*).
   - "Open Dashboard" direct call-to-action.

2. **Live Monitor (`/monitor`)**:
   - High-performance video viewport with transparent HTML5 Canvas overlay.
   - Dynamic polygonal hazard zones with warning buffers.
   - High-tech CV bounding boxes with corner brackets, foot contact points, and distance vector lines.
   - Prominent status indicator pill with pulsing animations.
   - Flashing red danger banner with procedural Web Audio API siren when DANGER is triggered.
   - Side panel with real-time detection telemetry (Person ID, Child/Adult classification, Euclidean proximity, velocity vector in m/s, guardian link).
   - Controls: Play/Pause/Stop stream, Source selector (Simulated CCTV, Live Webcam via `getUserMedia`, or Upload custom MP4/WebM), Layer toggles, and frame snapshot capture.

3. **Hazard Zone Editor (`/zones`)**:
   - Interactive drawing canvas on top of camera frames.
   - Click to place polygon vertices with rubber-banding line previews and snap-to-close indicators.
   - Hazard type classification: Water Tank / Cistern (`water`), Road Frontage (`road`), Open Storm Drain (`drain`).
   - Sliders for warning buffer distance and danger perimeter distance.
   - Manage, edit properties, toggle active state, or delete zones.

4. **Alert History (`/alerts`)**:
   - Filterable, searchable audit table with timestamps, child IDs, hazard zone names, threat levels, and approach velocities.
   - Snapshot thumbnail preview with click-to-enlarge high-resolution modal.
   - Filter by threat level, hazard type, and date range.
   - Single-click **"Export CSV"** function generating downloadable log files.

5. **Safety Analytics (`/analytics`)**:
   - KPI cards: Total Alerts, Unique Children Monitored, Average Response Time, and False Alarms Suppressed.
   - **Recharts Line Chart**: 14-day daily incident curve comparing Danger vs Warning breaches.
   - **Recharts Donut Chart**: Proportional breakdown by hazard type.
   - **Recharts Bar Chart**: Temporal risk distribution curve by hour of day (highlights peak risk hours 3:00 PM – 5:30 PM).

6. **System Settings (`/settings`)**:
   - Detection tuning sliders: Warning distance, Adult-nearby supervisor radius, Approach-speed threshold, Alert trigger cooldown.
   - Telegram Bot API configuration: Bot token, Chat ID, and simulated push test button.
   - Siren audio controls: volume slider, procedural tone preview, and mute toggle.
   - Theme switch: Light and Dark mode toggle.
   - Embed snippet generator with one-click copy button.

7. **IPCV Project Overview (`/about`)**:
   - Problem motivation, academic background, end-to-end 6-stage computer vision dataflow flowchart, technical specifications, and system limitations.

8. **Standalone Embed Route (`/embed`)**:
   - Ultra-clean, frameless monitor view specifically designed for embedding into parent apps, security control centers, or hospital monitors via `<iframe>`.

---

## 🔌 Backend-Ready API Contract

All data communication is centralized inside `src/api/client.js` with zero scattered `fetch` calls.

### Toggle Mock vs Real API
To connect to your Python / FastAPI / Flask computer vision backend:
Open `src/api/client.js` and update:
```javascript
export const USE_MOCK = false; // Set to false to connect to live backend
export const API_BASE_URL = 'http://localhost:8000';
export const WS_STREAM_URL = 'ws://localhost:8000/ws/stream';
```

### Expected REST Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/zones` | Returns array of configured polygonal hazard zones |
| `POST` | `/api/zones` | Creates or updates a hazard zone |
| `DELETE` | `/api/zones/{id}` | Deletes a hazard zone |
| `GET` | `/api/alerts` | Fetches recorded hazard alerts history |
| `POST` | `/api/alerts/{id}/ack` | Acknowledges an alert incident |
| `GET` | `/api/status` | Returns system telemetry (FPS, active model, GPU status) |
| `GET` | `/api/settings` | Fetches active threshold configuration |
| `POST` | `/api/settings` | Updates detection and notification settings |

### Expected WebSocket Stream Contract (`/ws/stream`)
The computer vision detection pipeline sends streaming JSON frames over WebSocket:

```json
{
  "frame_id": 1420,
  "timestamp": "2026-11-04T16:45:12.108Z",
  "status": "WARNING",
  "fps": 29.8,
  "people": [
    {
      "id": 4,
      "label": "Child-04",
      "is_child": true,
      "box": [380, 190, 418, 254],
      "level": "WARNING",
      "zone": "water",
      "zone_name": "Open Water Tank / Pool",
      "distance_px": 42,
      "speed": 1.4,
      "dist_to_adult": 115
    },
    {
      "id": 1,
      "label": "Adult-01 (Guardian)",
      "is_child": false,
      "box": [270, 200, 318, 305],
      "level": "SAFE",
      "zone": null,
      "zone_name": null,
      "distance_px": 120,
      "speed": 0.9,
      "dist_to_adult": null
    }
  ]
}
```

---

## 🖼️ Embed Support

To embed SafeWatch into external web applications, digital signage, or school safety portals:

```html
<iframe 
  src="http://localhost:3000/embed" 
  width="800" 
  height="500" 
  allow="camera"
  style="border: none; border-radius: 16px; overflow: hidden;"
></iframe>
```

---

## 📂 Project Architecture

```
src/
├── api/
│   ├── client.js         # Unified API client with USE_MOCK toggle
│   ├── mock.js           # LocalStorage mock store for zones, alerts, settings
│   └── mockStream.js     # Real-time WebSocket simulator with kinematics & state machine
├── components/
│   ├── common/
│   │   ├── Badge.jsx     # Status & Hazard badges (SAFE, WARNING, DANGER, SUPERVISED)
│   │   ├── Button.jsx    # Accessible, styled button variants
│   │   ├── Modal.jsx     # Accessible dialogs for snapshots & configs
│   │   ├── Skeleton.jsx  # Responsive loading skeleton states
│   │   └── Toast.jsx     # Floating real-time alert notifications
│   ├── layout/
│   │   ├── AlertBanner.jsx# High-visibility flashing banner on DANGER
│   │   ├── AppLayout.jsx  # Main application shell with sidebar & topbar
│   │   ├── Sidebar.jsx    # Dark navy navigation sidebar
│   │   └── Topbar.jsx     # Header with demo switch, alarm toggle & notifications
│   ├── monitor/
│   │   ├── DetectionList.jsx # Live sidepanel of tracked people & telemetry
│   │   ├── StreamControls.jsx# Video source, playback, and layer toggles
│   │   └── VideoCanvas.jsx   # Video element with synchronized canvas overlay
│   └── zone/
│       ├── ZoneCanvas.jsx    # Sub-pixel polygon drawing canvas
│       └── ZoneConfigModal.jsx# Zone properties and buffer distance editor
├── context/
│   ├── AlertContext.jsx   # Global alert store, toasts & sound triggers
│   ├── StreamContext.jsx  # WebSocket stream state, frame data & controls
│   └── ThemeContext.jsx   # Dark / Light mode manager
├── hooks/
│   ├── useWebcam.js       # WebRTC getUserMedia manager
│   └── (custom hooks)
├── pages/
│   ├── AboutPage.jsx      # IPCV course report, pipeline flowchart & limits
│   ├── AlertHistoryPage.jsx# Searchable audit table with CSV export
│   ├── AnalyticsPage.jsx  # Recharts risk curves and KPI telemetry
│   ├── EmbedMonitorPage.jsx# Minimalist iframe monitor
│   ├── LandingPage.jsx    # Product landing, problem statement & workflow
│   ├── LiveMonitorPage.jsx# Main AI surveillance control center
│   └── SettingsPage.jsx   # Parameter sliders, Telegram bot, and embed snippet
├── utils/
│   ├── audio.js           # Web Audio API dual-tone procedural siren
│   ├── formatters.js      # Distance, speed, and CSV export helpers
│   ├── geometry.js        # Raycasting and point-to-polygon distance math
│   └── presets.js         # Default hazard zones and mock data
├── App.jsx                # Route hierarchy and providers
├── index.css              # Tailwind base, components, and animations
└── main.jsx               # Application entrypoint
```

---

## 📷 Live Demo Instructions & Screenshots

When conducting the live IPCV project demonstration:
1. **Start the development server**:
   `npm run dev`
2. **Open the browser** at `http://localhost:3000`.
3. **Landing Page**: Walk through the problem motivation and the 4-step AI safety pipeline.
4. **Live Monitor (`/monitor`)**:
   - The dashboard opens in **Simulation Mode** by default.
   - Observe **Child-04** approaching the underground water tank.
   - When Child-04 enters the outer buffer, status turns to **WARNING (amber)**.
   - When Child-04 approaches within critical distance (< 25px), status turns to **DANGER (red)**, the red banner flashes, an urgent dual-tone beep alarm sounds, and a new alert toast is generated!
   - Observe **Adult-01 (Guardian)** stepping towards the child: when within 90px radius, the status dynamically switches to **SUPERVISED (teal)**, showcasing smart false alarm suppression.
   - Switch camera source to **Webcam** to demo live camera acquisition via `getUserMedia`.
   - Click **"Snapshot"** to demonstrate immediate computer vision frame extraction.
5. **Zone Editor (`/zones`)**:
   - Click **"Draw New Zone"**, click 3 or 4 points on the canvas to enclose a hazard, and click the starting point to close the polygon.
   - Set the zone name to "Backyard Pool", choose `Water`, adjust warning buffer slider, and click Save.
   - Return to `/monitor` and observe the new zone instantly participating in distance calculations!
6. **Alert History (`/alerts`)**:
   - Filter by DANGER level.
   - Click any snapshot thumbnail to inspect high-resolution incident details in the modal.
   - Click **"Export CSV"** to download the audit log.
7. **Analytics (`/analytics`)**:
   - Review the temporal risk curves and peak hazard hours.
8. **Settings & Embed (`/settings`)**:
   - Test the Telegram webhook simulator.
   - Copy the embed `<iframe>` snippet and preview `/embed`.

