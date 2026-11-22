# SafeWatch: AI Child Safety Monitor

> **"An extra pair of eyes"** — An intelligent computer vision surveillance system and web dashboard designed to detect, track, and protect children near unguarded physical hazard zones (open water sumps/tanks, municipal storm drains, and active roadway traffic) in real time.

Developed for the **Image Processing and Computer Vision (IPCV)** Course Project.

---

## 🌟 Key Features

- **Actual YOLOv8n Detection**: Detects persons (`class 0`) in video frames with bounding box extraction and confidence scoring.
- **ByteTrack Multi-Object Tracking**: Maintains persistent IDs across consecutive frames and tracks multiple individuals simultaneously.
- **Child vs. Adult Age Classification**: Dual-tier pipeline utilizing a custom-trained **PyTorch MobileNetV2** classifier alongside an anthropometric heuristic baseline with moving-average temporal smoothing. Returns `Unknown` when uncertain.
- **Polygonal Hazard Zone Analytics**: Sub-pixel geometric distance computation using **OpenCV `pointPolygonTest`** against custom zones (Water Tanks, Roadways, Open Drains).
- **Kinematic Movement Analysis**: Calculates velocity in meters per second and estimates approach vectors towards dangerous perimeters.
- **Adult Guardian Supervision Verification**: Verifies presence of nearby adult guardians (< 90px radius), intelligently suppressing warnings to `SUPERVISED` without ever suppressing critical `DANGER` breaches.
- **Real-Time Alert Dispatching**: Automatically captures high-resolution incident snapshots, logs auditable records to SQLite, sounds local procedural sirens, exports CSV logs, and sends instant **Telegram Bot notifications**.
- **Full-Duplex WebSocket Streaming**: Bi-directional communication between the React frontend and FastAPI Python AI engine at 15–20 FPS.
- **Graceful Fallback Mode**: If the Python backend is temporarily unavailable, the frontend continues functioning cleanly with simulated demonstration capabilities.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Client ["Frontend (React + Vite + Tailwind CSS)"]
        UI["Web Dashboard UI"]
        VC["Video & Overlay Canvas (680x480)"]
        WSClient["Live Inference WebSocket Client"]
        RESTClient["Unified API Client"]
    end

    subgraph Backend ["AI Safety Engine (Python 3.10+ / FastAPI)"]
        API["FastAPI REST & WebSocket Gateway"]
        
        subgraph Pipeline ["Inference Pipeline"]
            YOLO["YOLOv8n Person Detector\n(COCO Class 0)"]
            Tracker["ByteTrack Multi-Person Tracker\n(Persistent Track IDs)"]
            Classifier["MobileNetV2 Classifier\n(Child / Adult / Unknown)"]
            Zones["Hazard Zone Manager\n(OpenCV pointPolygonTest)"]
            Logic["Safety Kinematics & Logic Engine\n(Supervision & Danger Override)"]
        end

        subgraph StorageAlerts ["Storage & Notification Engine"]
            DB[("SQLite Database\n(safewatch.db)")]
            Snapshots["Incident Snapshot Storage\n(outputs/snapshots/)"]
            Telegram["Telegram Bot API\n(Async HTTP Dispatch)"]
        end
    end

    VC -->|JPEG Frame Stream| WSClient
    WSClient -->|WS /ws/stream| API
    API --> YOLO
    YOLO --> Tracker
    Tracker --> Classifier
    Classifier --> Zones
    Zones --> Logic
    Logic -->|Structured Detection JSON| API
    API -->|Real-time People & Zones Metadata| WSClient
    WSClient -->|Synchronized Overlay & Boxes| VC
    
    Logic -.->|On DANGER Breach| StorageAlerts
    StorageAlerts -.->|Photo & Alert Text| Telegram
    RESTClient <-->|REST /api/*| API
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend Framework** | Python 3.10+, FastAPI, Uvicorn, WebSockets, AsyncIO |
| **Computer Vision & AI**| OpenCV (`cv2`), Ultralytics YOLOv8n, ByteTrack, PyTorch, Torchvision MobileNetV2, Pillow, NumPy |
| **Database & Storage** | SQLite3 (`safewatch.db`), Local Disk JPEG Snapshots |
| **Notifications** | Telegram Bot API, Procedural Web Audio API Siren |
| **Frontend Framework** | React 18, Vite, JavaScript (ES6+), React Router (HashRouter) |
| **Styling & Icons** | Tailwind CSS, Lucide React Icons |
| **Data Visualization** | Recharts (Line, Donut, Bar Analytics) |

---

## 📁 Repository Structure

```
IPCV/
├── backend/                        # Complete Python AI Backend
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes.py               # REST API endpoints (zones, alerts, settings, snapshots)
│   │   └── websocket.py            # Real-time WebSocket inference stream handler
│   ├── core/
│   │   ├── __init__.py
│   │   ├── detector.py             # YOLOv8n person detector
│   │   ├── tracker.py              # ByteTrack multi-person tracker
│   │   ├── classifier.py           # MobileNetV2 + anthropometric child/adult classifier
│   │   ├── processor.py            # Master VideoProcessor orchestrator
│   │   ├── zones.py                # HazardZoneManager with OpenCV pointPolygonTest
│   │   ├── logic.py                # Kinematics, supervision & alert decision rules
│   │   └── alerts.py               # SQLite storage, cooldowns, snapshot & Telegram alerts
│   ├── scripts/
│   │   ├── train_classifier.py     # MobileNetV2 training pipeline with benchmark dataset
│   │   └── evaluate.py             # Accuracy, precision, recall, confusion matrix
│   ├── tests/
│   │   ├── test_scenarios.py       # 11-scenario automated verification test suite
│   │   └── test_stream.py          # WebSocket stream verification script
│   ├── data/
│   │   ├── adult/                  # Training images for adult class
│   │   └── child/                  # Training images for child class
│   ├── models/
│   │   ├── mobilenet_child_classifier.pth  # Trained PyTorch model weights
│   │   └── yolov8n.pt              # Ultralytics YOLOv8 weights (auto-downloaded)
│   ├── outputs/
│   │   └── snapshots/              # High-resolution incident snapshot archives
│   ├── config.yaml                 # Master system configuration file
│   ├── .env.example                # Environment variable template
│   ├── requirements.txt            # Python dependency specification
│   └── main.py                     # Backend application entrypoint
│
├── src/                            # Existing React Frontend (Preserved & Integrated)
│   ├── api/
│   │   ├── client.js               # Auto-detecting live backend client with fallback
│   │   ├── mock.js                 # Local cache fallback
│   │   └── mockStream.js           # Simulation engine (demo mode only)
│   ├── services/
│   │   └── liveInferenceClient.js  # Live WebSocket stream client
│   ├── components/
│   │   ├── monitor/                # VideoCanvas, StreamControls, DetectionList
│   │   ├── zone/                   # ZoneCanvas, ZoneConfigModal
│   │   └── common/                 # Badge, Button, Modal, Toast
│   ├── context/
│   │   ├── StreamContext.jsx       # Unified live stream and detection provider
│   │   ├── AlertContext.jsx        # Global alerts & audio manager
│   │   └── ThemeContext.jsx        # Dark/Light mode theme state
│   ├── pages/                      # Landing, LiveMonitor, ZoneEditor, AlertHistory, Analytics, Settings
│   ├── utils/                      # Geometry, formatters, audio synthesis
│   ├── App.jsx
│   └── main.jsx
├── docs/                           # GitHub Pages deployment build (.nojekyll, 404.html)
├── package.json
└── vite.config.js
```

---

## 🚀 Installation & Setup Guide

### 1. Prerequisites

- **Python**: 3.10, 3.11, or 3.12 (with pip)
- **Node.js**: v18.0.0 or higher
- **Git**

---

### 2. Backend Setup (Python)

1. **Navigate to the backend directory**:
   ```bash
   cd IPCV/backend
   ```

2. **Create and activate a Python virtual environment** (recommended):
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables** (optional for Telegram):
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   If using Telegram alerts, fill in `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.

5. **Start the FastAPI Backend Server**:
   ```bash
   python main.py
   ```
   *The server starts on `http://localhost:8000` with WebSocket endpoint `ws://localhost:8000/ws/stream`.*

---

### 3. Frontend Setup (React + Vite)

1. **Open a new terminal window** and navigate to the project root:
   ```bash
   cd IPCV
   ```

2. **Install Node dependencies**:
   ```bash
   npm install
   ```

3. **Start the frontend development server**:
   ```bash
   npm run dev
   ```

4. **Access the application**:
   Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🧠 Model Training & Evaluation

The system includes a dedicated training pipeline for the **MobileNetV2 Child vs. Adult Classifier**.

### Training the Classifier
Run the training script to generate the trained PyTorch weights:
```bash
python backend/scripts/train_classifier.py
```
- Trains on images in `backend/data/child/` and `backend/data/adult/`.
- If the dataset has few images, the script automatically seeds synthetic benchmark samples.
- Saves the model weights to: `backend/models/mobilenet_child_classifier.pth`.

### Evaluating Model Performance
Run the evaluation script to compute performance metrics:
```bash
python backend/scripts/evaluate.py
```
Outputs:
- Accuracy, Precision, Recall, and F1-Score per class
- Full Confusion Matrix

---

## 📹 Video Input Modes

### 1. Live Browser Webcam
1. Go to the **Live Monitor** (`/monitor`) or **Hazard Zone Editor** (`/zones`).
2. Click **"Live Webcam"** in the source selector toolbar.
3. Grant camera permission in your browser.
4. Frames from `navigator.mediaDevices.getUserMedia` are captured and streamed at 15–20 FPS to the Python backend over WebSocket.
5. The overlay displays real-time YOLOv8 bounding boxes, ByteTrack IDs, child/adult classification, and proximity lines.

### 2. Uploaded Custom Video (MP4 / WebM)
1. Go to **Live Monitor** or **Zone Editor**.
2. Click **"Upload Video"** and choose any standard `.mp4` or `.webm` footage.
3. The video plays immediately in the viewport while frames are continuously processed through YOLOv8 and ByteTrack.
4. If a child enters an active hazard perimeter, the status escalates to **DANGER**, a snapshot is saved, and an alert sounds.

### 3. CCTV RTSP Stream
To connect an IP camera or NVR:
1. Open `backend/config.yaml`.
2. Under `video.rtsp_url`, specify your camera stream:
   ```yaml
   video:
     rtsp_url: "rtsp://username:password@192.168.1.100:554/stream1"
   ```

---

## 📲 Telegram Bot Alert Setup

1. Open Telegram and search for `@BotFather`.
2. Send `/newbot`, choose a name and username, and copy the **API Bot Token**.
3. Start a chat with your new bot and send any message (e.g., "Hello").
4. Search for `@userinfobot` on Telegram to get your **Chat ID**.
5. Add your credentials in `backend/.env` or `backend/config.yaml`:
   ```bash
   TELEGRAM_BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
   TELEGRAM_CHAT_ID="987654321"
   ```
6. When a child breaches a hazard zone, SafeWatch automatically dispatches an instant photo snapshot and warning message directly to your phone.

---

## 🔌 API Specification

### REST Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/status` | Returns system telemetry, model status, and active hardware |
| `GET` | `/api/zones` | Fetches all configured polygonal hazard zones from SQLite |
| `POST` | `/api/zones` | Creates or updates a hazard zone |
| `DELETE` | `/api/zones/{id}` | Deletes a hazard zone |
| `GET` | `/api/alerts` | Returns recorded hazard breach alerts |
| `POST` | `/api/alerts/{id}/ack`| Acknowledges an alert |
| `DELETE` | `/api/alerts` | Clears all alerts |
| `GET` | `/api/alerts/export` | Downloads the alert history as a CSV file |
| `GET` | `/api/settings` | Retrieves current detection thresholds and settings |
| `POST` | `/api/settings` | Updates detection thresholds |
| `POST` | `/api/reset` | Resets zones and settings to default factory presets |
| `POST` | `/api/upload-video` | Uploads a video file to the server |
| `GET` | `/snapshots/{filename}` | Serves incident snapshot images |

### WebSocket Protocol (`ws://localhost:8000/ws/stream`)

**Incoming Client Frame (React → Python):**
```json
{
  "type": "frame",
  "frame": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Outgoing Inference Result (Python → React):**
```json
{
  "frame_id": 1420,
  "timestamp": "2026-11-23T01:30:00.000Z",
  "status": "DANGER",
  "fps": 18.5,
  "active_zones_count": 3,
  "people": [
    {
      "id": 4,
      "track_id": 4,
      "label": "Child-04",
      "is_child": true,
      "classification": "Child",
      "confidence": 0.94,
      "box": [380, 190, 418, 254],
      "level": "DANGER",
      "zone": "water",
      "zone_name": "Open Water Tank / Pool",
      "distance_px": 12.4,
      "speed": 1.45,
      "direction": "APPROACHING",
      "dist_to_adult": 145.0
    }
  ],
  "new_alerts": [
    {
      "id": "alt-1795376500",
      "timestamp": "2026-11-23T01:30:00.000Z",
      "child_id": "Child-04",
      "level": "DANGER",
      "zone": "water",
      "zone_name": "Open Water Tank / Pool",
      "distance_px": 12.4,
      "speed": 1.45,
      "snapshot_url": "http://localhost:8000/snapshots/snapshot_Child-04_1795376500.jpg",
      "acknowledged": false
    }
  ]
}
```

---

## 🧪 Automated Testing

SafeWatch includes an automated test suite verifying all 11 core scenarios specified in Phase 13:

```bash
python backend/tests/test_scenarios.py
```

### Verified Test Scenarios:
1. **Video containing one child**: Tracks single child and computes distance vectors.
2. **Video containing multiple people**: Multi-person ByteTrack association.
3. **Video containing children and adults**: Evaluates each person independently.
4. **Child moving towards water tank**: Detects proximity and triggers DANGER perimeter.
5. **Child entering road danger zone**: Identifies inside-polygon breach and triggers instant alert.
6. **Child entering open drain**: Flags trench hazard and triggers DANGER.
7. **Adult accompanying child**: Proximity suppresses WARNING to SUPERVISED; DANGER is strictly preserved if inside hazard zone.
8. **Video with no people**: Handles empty frames gracefully with zero false positives.
9. **Unavailable webcam handling**: Catches browser errors with helpful UI prompts.
10. **Missing classification model**: Falls back smoothly to anthropometric baseline, returning `Unknown`.
11. **Network resilience**: Falls back to offline client mode without crashing.

To verify the live WebSocket stream independently:
```bash
python backend/tests/test_stream.py
```

---

## ⚠️ Limitations & Ethical Considerations

1. **Anthropometric Visual Estimation**:
   The classifier uses visual appearance, aspect ratios, and relative body proportions. It provides a visual estimation and **does not legally verify or certify a person's exact chronological age**.
2. **Perspective & Pixel Distance**:
   Distances are computed in 2D image coordinates (pixels) and converted to approximate meters using typical camera calibrations. Lens distortion, extreme tilt, and perspective distortion affect uncalibrated depth perception.
3. **Occlusion & Lighting**:
   Severe physical occlusion or low-light conditions may degrade detection confidence.
4. **Supervision Disclaimer**:
   SafeWatch is an assistive alerting tool designed to augment human awareness. It is not an automated life-support system and does not replace active parental or guardian supervision.

---

## 📜 License & Acknowledgments

Developed as an academic research and engineering project for **Image Processing and Computer Vision (IPCV)**.
Powered by Ultralytics YOLOv8, PyTorch, and FastAPI.
