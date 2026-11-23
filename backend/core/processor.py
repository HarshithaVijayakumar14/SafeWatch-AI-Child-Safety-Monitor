"""
Video Processing Pipeline Orchestrator for SafeWatch AI
Binds Detection, ByteTrack, MobileNetV2 Classification, Hazard Proximity & Alert Triggering.
"""
from pathlib import Path
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

    def process_video_file(
        self,
        video_path: str,
        output_annotated_path: Optional[str] = None,
        max_frames: Optional[int] = None,
        frame_stride: int = 1,
        progress_callback: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Reads a video file frame-by-frame using OpenCV (cv2.VideoCapture), passes every
        frame through YOLOv8n detection, ByteTrack tracking, MobileNetV2 classification,
        hazard proximity evaluation, and alert triggering.

        Args:
            video_path: Path to MP4, AVI, WebM, or MKV video file
            output_annotated_path: Optional path to save an annotated MP4 video file
            max_frames: Optional maximum number of frames to process
            frame_stride: Process every Nth frame (default 1 = every frame)
            progress_callback: Optional callback fn(current_frame, total_frames, fps)

        Returns:
            Structured dictionary with summary analytics, unique tracks, and per-frame records.
        """
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise ValueError(f"Could not open video file at {video_path}")

        # Extract video properties
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = float(cap.get(cv2.CAP_PROP_FPS) or 25.0)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        duration_sec = total_frames / max(1.0, fps) if total_frames > 0 else 0.0

        # Reset pipeline state for fresh video tracking
        self.reset_stream()

        writer = None
        if output_annotated_path:
            out_p = Path(output_annotated_path)
            out_p.parent.mkdir(parents=True, exist_ok=True)
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            writer = cv2.VideoWriter(str(out_p), fourcc, fps, (width, height))

        frame_idx = 0
        processed_count = 0
        start_t = time.time()
        per_frame_results = []
        all_triggered_alerts = []
        peak_level = "SAFE"
        unique_tracks: Dict[int, Dict[str, Any]] = {}

        try:
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret or frame is None or frame.size == 0:
                    break

                frame_idx += 1
                if frame_stride > 1 and (frame_idx % frame_stride != 0):
                    continue

                if max_frames and processed_count >= max_frames:
                    break

                processed_count += 1

                # Execute full inference pipeline
                res = self.process_frame(frame, return_annotated=False)

                # Draw annotations for output video if writer is active
                if writer is not None:
                    annotated_img = self._draw_annotations(frame.copy(), res.get("people", []))
                    writer.write(annotated_img)

                # Record frame data
                frame_record = {
                    "frame_id": frame_idx,
                    "timestamp": res["timestamp"],
                    "status": res["status"],
                    "people_count": len(res.get("people", [])),
                    "people": res.get("people", [])
                }
                per_frame_results.append(frame_record)

                # Track peak status
                status = res["status"]
                if status == "DANGER":
                    peak_level = "DANGER"
                elif status == "WARNING" and peak_level != "DANGER":
                    peak_level = "WARNING"
                elif status == "SUPERVISED" and peak_level == "SAFE":
                    peak_level = "SUPERVISED"

                # Track unique individuals
                for p in res.get("people", []):
                    tid = p["id"]
                    if tid not in unique_tracks:
                        unique_tracks[tid] = {
                            "track_id": tid,
                            "classification": p.get("classification", "Unknown"),
                            "is_child": p.get("is_child", False),
                            "confidence": p.get("confidence", 0.0),
                            "first_seen_frame": frame_idx,
                            "last_seen_frame": frame_idx,
                            "max_risk_level": p.get("level", "SAFE")
                        }
                    else:
                        unique_tracks[tid]["last_seen_frame"] = frame_idx
                        cur_lvl = unique_tracks[tid]["max_risk_level"]
                        p_lvl = p.get("level", "SAFE")
                        if p_lvl == "DANGER" or (p_lvl == "WARNING" and cur_lvl != "DANGER"):
                            unique_tracks[tid]["max_risk_level"] = p_lvl

                if res.get("new_alerts"):
                    all_triggered_alerts.extend(res["new_alerts"])

                if progress_callback and frame_idx % 10 == 0:
                    elapsed = time.time() - start_t
                    cur_fps = processed_count / max(0.001, elapsed)
                    progress_callback(frame_idx, total_frames, cur_fps)

        finally:
            cap.release()
            if writer is not None:
                writer.release()

        total_elapsed = time.time() - start_t
        processing_fps = round(processed_count / max(0.001, total_elapsed), 2)

        children_count = sum(1 for t in unique_tracks.values() if t["is_child"])
        adults_count = sum(1 for t in unique_tracks.values() if not t["is_child"])

        return {
            "video_metadata": {
                "filepath": str(video_path),
                "width": width,
                "height": height,
                "fps": round(fps, 2),
                "total_frames": total_frames,
                "duration_seconds": round(duration_sec, 2)
            },
            "processing_summary": {
                "frames_processed": processed_count,
                "processing_time_sec": round(total_elapsed, 2),
                "processing_fps": processing_fps,
                "peak_status": peak_level,
                "unique_people_detected": len(unique_tracks),
                "children_detected": children_count,
                "adults_detected": adults_count,
                "total_alerts_triggered": len(all_triggered_alerts)
            },
            "unique_tracks": list(unique_tracks.values()),
            "alerts": all_triggered_alerts,
            "output_annotated_video": output_annotated_path if writer is not None else None,
            "per_frame_results": per_frame_results
        }
