"""
ByteTrack Real-Time Multi-Person Tracking Module for SafeWatch AI
Maintains persistent IDs and trajectories across video frames.
"""
from collections import deque
from pathlib import Path
from typing import List, Dict, Any, Optional
import time
import logging
import numpy as np

logger = logging.getLogger("safewatch.tracker")


class PersonTracker:
    """
    ByteTrack-based Multi-Person Tracker leveraging Ultralytics YOLOv8 tracking.
    Guarantees stable track IDs across consecutive frames and tracks movement history.
    """

    def __init__(
        self,
        model_path: str = "models/yolov8n.pt",
        tracker_type: str = "bytetrack.yaml",
        conf_threshold: float = 0.35,
        iou_threshold: float = 0.45,
        track_history_len: int = 30,
        device: str = "auto"
    ):
        self.model_path = model_path
        self.tracker_type = tracker_type
        self.conf_threshold = conf_threshold
        self.iou_threshold = iou_threshold
        self.track_history_len = track_history_len
        self.device = self._resolve_device(device)
        self.model = None

        # Trajectory history per track ID: { track_id: deque([ (cx, cy, timestamp), ... ], maxlen=30) }
        self.trajectories: Dict[int, deque] = {}
        # Last seen timestamp per track ID: { track_id: float }
        self.last_seen: Dict[int, float] = {}

        self._load_model()

    def _resolve_device(self, device: str) -> str:
        """Resolve device string to appropriate PyTorch device."""
        if device == "auto":
            try:
                import torch
                if torch.cuda.is_available():
                    return "cuda"
            except Exception:
                pass
            return "cpu"
        return device

    def _load_model(self) -> None:
        """Initialize the YOLO tracking engine."""
        try:
            from ultralytics import YOLO

            target_path = Path(self.model_path)
            if not target_path.exists():
                alt_path = Path(__file__).resolve().parent.parent / self.model_path
                if alt_path.exists():
                    target_path = alt_path
            
            if not target_path.exists():
                logger.info("Loading/downloading YOLO for tracker: yolov8n.pt...")
                self.model = YOLO("yolov8n.pt")
            else:
                self.model = YOLO(str(target_path))

            logger.info(f"PersonTracker successfully initialized with tracker '{self.tracker_type}'.")

        except Exception as e:
            logger.error(f"Failed to initialize tracker model: {e}", exc_info=True)
            self.model = None

    def reset(self) -> None:
        """Clear all active tracks and reset trajectories (e.g. on new stream or video upload)."""
        self.trajectories.clear()
        self.last_seen.clear()
        # Reset internal tracker state in YOLO model if available
        if self.model is not None and hasattr(self.model, "predictor") and self.model.predictor is not None:
            if hasattr(self.model.predictor, "trackers"):
                self.model.predictor.trackers = None
        logger.info("PersonTracker state reset.")

    def track(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """
        Run ByteTrack tracking on a single frame.

        Args:
            frame: Numpy BGR image array (H, W, C)

        Returns:
            List of actively tracked person objects:
            [
                {
                    "track_id": int,
                    "box": [x1, y1, x2, y2],
                    "confidence": float,
                    "centroid": (cx, cy),
                    "foot_point": (fx, fy),
                    "class_name": "person"
                },
                ...
            ]
        """
        if self.model is None or frame is None or frame.size == 0:
            return []

        now = time.time()
        tracks: List[Dict[str, Any]] = []

        try:
            # Run Ultralytics track with persist=True for ByteTrack temporal association
            results = self.model.track(
                source=frame,
                persist=True,
                tracker=self.tracker_type,
                classes=[0],  # Person class only
                conf=self.conf_threshold,
                iou=self.iou_threshold,
                device=self.device,
                verbose=False
            )

            for r in results:
                boxes = r.boxes
                if boxes is None or len(boxes) == 0:
                    continue

                for i in range(len(boxes)):
                    coords = boxes.xyxy[i].cpu().numpy()
                    conf = float(boxes.conf[i].cpu().numpy())

                    # Tracking ID assigned by ByteTrack
                    track_id: Optional[int] = None
                    if boxes.id is not None:
                        try:
                            track_id = int(boxes.id[i].cpu().numpy())
                        except Exception:
                            track_id = None

                    # If tracker didn't assign an ID (e.g. first frame or low score), assign deterministic temp ID
                    if track_id is None:
                        track_id = 900 + i

                    x1, y1, x2, y2 = [int(v) for v in coords]

                    # Sanity check
                    if x2 <= x1 or y2 <= y1:
                        continue

                    cx = int((x1 + x2) / 2)
                    cy = int((y1 + y2) / 2)
                    # Ground contact foot point (bottom-centre of bounding box)
                    foot_point = (cx, y2)

                    # Update historical trajectory
                    if track_id not in self.trajectories:
                        self.trajectories[track_id] = deque(maxlen=self.track_history_len)

                    self.trajectories[track_id].append((cx, foot_point[1], now))
                    self.last_seen[track_id] = now

                    tracks.append({
                        "track_id": track_id,
                        "box": [x1, y1, x2, y2],
                        "confidence": round(conf, 3),
                        "centroid": (cx, cy),
                        "foot_point": foot_point,
                        "class_name": "person"
                    })

            # Clean up stale trajectories older than 10 seconds
            stale_ids = [tid for tid, last_t in self.last_seen.items() if now - last_t > 10.0]
            for tid in stale_ids:
                self.trajectories.pop(tid, None)
                self.last_seen.pop(tid, None)

            return tracks

        except Exception as e:
            logger.error(f"Tracking error in PersonTracker.track: {e}", exc_info=True)
            return []

    def get_trajectory(self, track_id: int) -> List[tuple]:
        """Return list of past (x, y, timestamp) coordinates for a given track ID."""
        if track_id in self.trajectories:
            return list(self.trajectories[track_id])
        return []
