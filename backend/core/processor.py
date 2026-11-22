"""
Video Processing Pipeline Orchestrator for SafeWatch AI
Binds Detection, ByteTrack, MobileNetV2 Classification, Hazard Proximity & Alert Triggering.
"""
from typing import Dict, Any, List, Optional
import time
import base64
import logging
import cv2
import numpy as np

from .detector import YOLOv8PersonDetector
from .tracker import PersonTracker
from .classifier import ChildAdultClassifier
from .zones import HazardZoneManager
from .logic import SafetyLogicEngine
from .alerts import AlertManager

logger = logging.getLogger("safewatch.processor")


class VideoProcessor:
    """
    Core end-to-end inference pipeline for SafeWatch.
    Processes webcam frames, uploaded video frames, and CCTV streams.
    """

    def __init__(
        self,
        config: Dict[str, Any],
        zone_manager: HazardZoneManager,
        alert_manager: AlertManager
    ):
        self.config = config
        self.zone_manager = zone_manager
        self.alert_manager = alert_manager

        models_cfg = config.get("models", {})
        tracking_cfg = config.get("tracking", {})
        class_cfg = config.get("classification", {})
        alerts_cfg = config.get("alerts", {})

        # 1. Initialize ByteTrack Tracker
        self.tracker = PersonTracker(
            model_path=models_cfg.get("yolo_model", "models/yolov8n.pt"),
            tracker_type=tracking_cfg.get("tracker_type", "bytetrack.yaml"),
            conf_threshold=float(models_cfg.get("conf_threshold", 0.35)),
            iou_threshold=float(models_cfg.get("iou_threshold", 0.45)),
            track_history_len=int(tracking_cfg.get("track_buffer", 30)),
            device=models_cfg.get("device", "auto")
        )

        # 2. Initialize Child vs Adult Classifier
        self.classifier = ChildAdultClassifier(
            model_path=models_cfg.get("classifier_model", "models/mobilenet_child_classifier.pth"),
            use_mobilenet=class_cfg.get("use_mobilenet", True),
            conf_threshold=float(class_cfg.get("mobilenet_conf_thresh", 0.60)),
            temporal_window=int(class_cfg.get("temporal_window_frames", 10)),
            baseline_height_ratio=float(class_cfg.get("baseline_height_ratio_thresh", 0.42)),
            device=models_cfg.get("device", "auto")
        )

        # 3. Initialize Kinematic & Supervision Logic Engine
        self.logic = SafetyLogicEngine(
            adult_nearby_distance=float(alerts_cfg.get("adult_nearby_distance", 90.0)),
            approach_speed_threshold=float(alerts_cfg.get("approach_speed_threshold", 1.5))
        )

        self.frame_counter = 0
        self.start_time = time.time()
        self.last_frame_time = time.time()

    def reset_stream(self) -> None:
        """Reset internal trackers when switching video sources."""
        self.tracker.reset()
        self.classifier.reset_all()
        self.frame_counter = 0
        self.start_time = time.time()
        logger.info("VideoProcessor stream state reset.")

    def process_frame(
        self,
        frame: np.ndarray,
        return_annotated: bool = False
    ) -> Dict[str, Any]:
        """
        Process a single BGR video frame through the complete AI safety pipeline.

        Args:
            frame: Numpy BGR image array (H, W, 3)
            return_annotated: Whether to encode and return an annotated BGR frame as base64 JPEG

        Returns:
            Structured dictionary matching the frontend `frameData` WebSocket contract.
        """
        self.frame_counter += 1
        now = time.time()
        dt = max(0.001, now - self.last_frame_time)
        fps = round(1.0 / dt, 1)
        self.last_frame_time = now

        if frame is None or frame.size == 0:
            return {
                "frame_id": self.frame_counter,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(now)),
                "people": [],
                "status": "SAFE",
                "fps": fps,
                "active_zones_count": len([z for z in self.zone_manager.get_all() if z.get("enabled", True)])
            }

        fh, fw = frame.shape[:2]

        # 1. ByteTrack Multi-Person Tracking
        tracks = self.tracker.track(frame)
        all_boxes = [t["box"] for t in tracks]

        # 2. First pass: Classify each person (Child, Adult, or Unknown)
        classified_tracks = []
        adult_foot_points = []

        for track in tracks:
            box = track["box"]
            track_id = track["track_id"]

            cls_result = self.classifier.classify(
                frame=frame,
                box=box,
                track_id=track_id,
                frame_shape=(fh, fw),
                other_boxes=all_boxes
            )

            is_child = cls_result["is_child"]
            foot_point = track["foot_point"]

            if not is_child:
                adult_foot_points.append(foot_point)

            classified_tracks.append({
                "track": track,
                "classification_result": cls_result,
                "is_child": is_child
            })

        # 3. Second pass: Calculate Hazard Proximity, Kinematics, and Supervision
        evaluated_people: List[Dict[str, Any]] = []
        overall_status = "SAFE"
        new_alerts: List[Dict[str, Any]] = []

        for item in classified_tracks:
            track = item["track"]
            cls_result = item["classification_result"]
            is_child = item["is_child"]
            foot_point = track["foot_point"]
            track_id = track["track_id"]

            # Compute shortest Euclidean distance to active hazard zones using OpenCV pointPolygonTest
            min_dist, nearest_zone, is_inside, base_level = self.zone_manager.compute_proximity(
                foot_point=foot_point,
                frame_shape=(fh, fw)
            )

            # Retrieve past trajectory coordinates
            trajectory = self.tracker.get_trajectory(track_id)

            # Evaluate kinematics, approach vectors, and adult proximity
            person_eval = self.logic.evaluate_person(
                person_track=track,
                is_child=is_child,
                distance_to_hazard=min_dist,
                nearest_zone=nearest_zone,
                is_inside_hazard=is_inside,
                base_zone_level=base_level,
                adult_foot_points=adult_foot_points,
                trajectory=trajectory
            )

            # Merge classification metadata
            person_eval["classification"] = cls_result["classification"]
            person_eval["confidence"] = cls_result["confidence"]

            evaluated_people.append(person_eval)

            # Escalate overall system status: DANGER > WARNING > SUPERVISED > SAFE
            level = person_eval["level"]
            if level == "DANGER":
                overall_status = "DANGER"
                # Check alert cooldown and record real alert with snapshot
                triggered = self.alert_manager.trigger_alert(
                    person_eval=person_eval,
                    frame=frame
                )
                if triggered:
                    new_alerts.append(triggered)
            elif level == "WARNING" and overall_status != "DANGER":
                overall_status = "WARNING"
            elif level == "SUPERVISED" and overall_status == "SAFE":
                overall_status = "SUPERVISED"

        # Optional annotated frame encoding
        annotated_b64 = None
        if return_annotated:
            try:
                annotated = self._draw_annotations(frame.copy(), evaluated_people)
                _, buffer = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 75])
                annotated_b64 = base64.b64encode(buffer).decode("utf-8")
            except Exception as e:
                logger.error(f"Error drawing annotations: {e}")

        return {
            "frame_id": self.frame_counter,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(now)),
            "status": overall_status,
            "fps": fps,
            "active_zones_count": len([z for z in self.zone_manager.get_all() if z.get("enabled", True)]),
            "people": evaluated_people,
            "new_alerts": new_alerts,
            "annotated_frame": annotated_b64
        }

    def _draw_annotations(self, img: np.ndarray, people: List[Dict[str, Any]]) -> np.ndarray:
        """Draw bounding boxes, track IDs, and distance vectors onto BGR frame."""
        for p in people:
            x1, y1, x2, y2 = p["box"]
            level = p.get("level", "SAFE")

            # Color map matching frontend
            color = (34, 197, 94)  # Green = SAFE
            if level == "DANGER":
                color = (68, 68, 239)  # Red = DANGER (BGR)
            elif level == "WARNING":
                color = (11, 158, 245)  # Orange/Amber = WARNING (BGR)
            elif level == "SUPERVISED":
                color = (212, 182, 6)  # Cyan = SUPERVISED (BGR)

            cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)
            label = f"{p['label']} [{p.get('classification', 'Person')}] {p['level']}"
            cv2.putText(img, label, (x1, max(15, y1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1, cv2.LINE_AA)

        return img
