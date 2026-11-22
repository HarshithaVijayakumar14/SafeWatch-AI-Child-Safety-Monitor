"""
SafeWatch AI Child Safety Monitor - FastAPI Main Application Entrypoint
Hosts REST endpoints, WebSocket streaming, and static snapshot serving.
"""
from pathlib import Path
from contextlib import asynccontextmanager
import os
import yaml
import logging
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from core.zones import HazardZoneManager
from core.alerts import AlertManager
from core.processor import VideoProcessor
from api.routes import router as api_router, set_dependencies
from api.websocket import websocket_endpoint

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("safewatch.main")

# Load configuration
config_path = Path(__file__).resolve().parent / "config.yaml"
config = {}
if config_path.exists():
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f) or {}
    except Exception as e:
        logger.warning(f"Failed to read config.yaml: {e}. Using defaults.")

# Override with environment variables
server_cfg = config.get("server", {})
models_cfg = config.get("models", {})
alerts_cfg = config.get("alerts", {})
telegram_cfg = config.get("telegram", {})

port = int(os.environ.get("SAFEWATCH_PORT", server_cfg.get("port", 8000)))
host = os.environ.get("SAFEWATCH_HOST", server_cfg.get("host", "0.0.0.0"))

db_path = str(Path(__file__).resolve().parent / alerts_cfg.get("database_path", "safewatch.db"))
snapshots_dir = Path(__file__).resolve().parent / alerts_cfg.get("snapshots_dir", "outputs/snapshots")
snapshots_dir.mkdir(parents=True, exist_ok=True)

# Instantiate core managers
zone_manager = HazardZoneManager(db_path=db_path)
alert_manager = AlertManager(
    db_path=db_path,
    snapshots_dir=str(snapshots_dir),
    cooldown_sec=float(alerts_cfg.get("cooldown_sec", 15.0)),
    telegram_token=os.environ.get("TELEGRAM_BOT_TOKEN", telegram_cfg.get("bot_token", "")),
    telegram_chat_id=os.environ.get("TELEGRAM_CHAT_ID", telegram_cfg.get("chat_id", ""))
)
video_processor = VideoProcessor(
    config=config,
    zone_manager=zone_manager,
    alert_manager=alert_manager
)

# Connect dependency injection
set_dependencies(
    zm=zone_manager,
    am=alert_manager,
    proc=video_processor,
    cfg=config
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown procedures."""
    logger.info("=" * 60)
    logger.info("   SAFEWATCH AI CHILD SAFETY MONITOR BACKEND INITIALIZING")
    logger.info("=" * 60)
    logger.info(f"Database Path: {db_path}")
    logger.info(f"Snapshots Dir: {snapshots_dir}")
    logger.info(f"Active Hazard Zones: {len(zone_manager.get_all())}")
    logger.info(f"YOLO Detector: {'LOADED' if video_processor.tracker.model else 'FALLBACK'}")
    logger.info(f"Classifier: {'LOADED' if video_processor.classifier.torch_model else 'HEURISTIC'}")
    logger.info("=" * 60)
    yield
    logger.info("Shutting down SafeWatch backend services.")


app = FastAPI(
    title="SafeWatch AI Child Safety Monitor",
    description="Real-time multi-hazard proximity inference and guardian supervision API",
    version="2.0.0",
    lifespan=lifespan
)

# Configure CORS Middleware
allowed_origins = server_cfg.get("cors_origins", ["*"])
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for snapshots
app.mount("/snapshots", StaticFiles(directory=str(snapshots_dir)), name="snapshots")

# Attach REST API router
app.include_router(api_router)


# WebSocket Route
@app.websocket("/ws/stream")
async def ws_stream(websocket: WebSocket):
    await websocket_endpoint(websocket, video_processor)


@app.get("/")
async def root():
    """Root health and discovery endpoint."""
    return {
        "app": "SafeWatch AI Child Safety Monitor",
        "version": "2.0.0",
        "status": "RUNNING",
        "endpoints": {
            "status": "/api/status",
            "zones": "/api/zones",
            "alerts": "/api/alerts",
            "settings": "/api/settings",
            "stream_websocket": "/ws/stream",
            "docs": "/docs"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=server_cfg.get("reload", False)
    )
