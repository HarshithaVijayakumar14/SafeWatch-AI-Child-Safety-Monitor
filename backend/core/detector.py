"""
YOLOv8 Person Detector Module for SafeWatch AI
Handles real-time person detection (COCO class 0) using Ultralytics YOLOv8.
"""
from pathlib import Path
from typing import List, Dict, Any, Optional
import logging
import numpy as np

logger = logging.getLogger("safewatch.detector")


class YOLOv8PersonDetector:
    """
    Ultralytics YOLOv8 Person Detector.
    Filters specifically for COCO class 0 (person).
    """

    def __init__(
        self,
        model_path: str = "models/yolov8n.pt",
        conf_threshold: float = 0.18,
        iou_threshold: float = 0.45,
        device: str = "auto"
    ):
        self.model_path = model_path
        self.conf_threshold = conf_threshold
        self.iou_threshold = iou_threshold
        self.device = self._resolve_device(device)
        self.model = None

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
        """Load YOLOv8 model from file or download default yolov8n weights."""
        try:
            from ultralytics import YOLO

            target_path = Path(self.model_path)
            if not target_path.exists():
                logger.info(f"YOLO model not found at {target_path}. Using/downloading yolov8n.pt...")
                # Ultralytics will auto-download yolov8n.pt if not present locally
                self.model = YOLO("yolov8n.pt")
                # Save into models directory for local persistence if directory exists
                try:
                    target_path.parent.mkdir(parents=True, exist_ok=True)
                except Exception:
                    pass
            else:
                logger.info(f"Loading local YOLO model from {target_path}")
                self.model = YOLO(str(target_path))

            logger.info(f"YOLOv8PersonDetector successfully initialized on device '{self.device}'.")

        except Exception as e:
            logger.error(f"Failed to initialize YOLO model: {e}", exc_info=True)
            self.model = None

    def is_loaded(self) -> bool:
        """Check if YOLO model is currently loaded and ready."""
        return self.model is not None

    def detect(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """
        Run person detection on a single BGR frame.

        Args:
            frame: Numpy BGR image array (H, W, C)

        Returns:
            List of detected person objects with bounding boxes and confidences:
            [
                {
                    "box": [x1, y1, x2, y2],  # int pixel coordinates
                    "confidence": float,
                    "class_id": 0,
                    "class_name": "person"
                },
                ...
            ]
        """
        if self.model is None or frame is None or frame.size == 0:
            return []

        try:
            # Predict only class 0 (person in COCO)
            results = self.model.predict(
                source=frame,
                classes=[0],
                conf=self.conf_threshold,
                iou=self.iou_threshold,
                device=self.device,
                verbose=False
            )

            detections: List[Dict[str, Any]] = []

            for r in results:
                boxes = r.boxes
                if boxes is None or len(boxes) == 0:
                    continue

                for i in range(len(boxes)):
                    coords = boxes.xyxy[i].cpu().numpy()
                    conf = float(boxes.conf[i].cpu().numpy())
                    cls_id = int(boxes.cls[i].cpu().numpy())

                    x1, y1, x2, y2 = [int(v) for v in coords]

                    # Sanity check box dimensions
                    if x2 <= x1 or y2 <= y1:
                        continue

                    detections.append({
                        "box": [x1, y1, x2, y2],
                        "confidence": round(conf, 3),
                        "class_id": cls_id,
                        "class_name": "person"
                    })

            return detections

        except Exception as e:
            logger.error(f"Inference error in YOLOv8PersonDetector.detect: {e}", exc_info=True)
            return []
