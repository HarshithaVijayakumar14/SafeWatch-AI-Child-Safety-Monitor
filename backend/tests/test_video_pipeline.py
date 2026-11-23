"""
Comprehensive End-to-End Video Processing & Classification Test Suite for SafeWatch AI
Validates the complete pipeline on 5 realistic surveillance video scenarios:
1. Child walking towards a water tank hazard.
2. Child running rapidly towards an open drain.
3. Adult and child together (Supervised mode filter check).
4. Child at varying distances (small/far to near perspective zoom).
5. Low-light / outdoor surveillance conditions.
"""
from pathlib import Path
import os
import sys
import time
import math
import cv2
import numpy as np

# Ensure parent directory is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.detector import YOLOv8PersonDetector
from core.tracker import PersonTracker
from core.classifier import ChildAdultClassifier
from core.zones import HazardZoneManager
from core.logic import SafetyLogicEngine
from core.alerts import AlertManager
from core.processor import VideoProcessor
from scripts.train_classifier import _draw_realistic_person


def generate_scenario_video(
    output_path: str,
    scenario_type: str,
    width: int = 680,
    height: int = 480,
    fps: int = 20,
    num_frames: int = 60
) -> str:
    """Generate a realistic test surveillance video for a specific scenario."""
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    # Pre-render high-quality realistic human crops
    child_crop_pil = _draw_realistic_person(is_child=True, pose="walking")
    child_crop_np = cv2.cvtColor(np.array(child_crop_pil), cv2.COLOR_RGB2BGR)

    child_run_pil = _draw_realistic_person(is_child=True, pose="running")
    child_run_np = cv2.cvtColor(np.array(child_run_pil), cv2.COLOR_RGB2BGR)

    adult_crop_pil = _draw_realistic_person(is_child=False, pose="standing")
    adult_crop_np = cv2.cvtColor(np.array(adult_crop_pil), cv2.COLOR_RGB2BGR)

    # Base background (outdoor yard with lawn, pathway, and hazard area)
    base_bg = np.zeros((height, width, 3), dtype=np.uint8)
    base_bg[:] = (70, 115, 60)  # Green grass
    # Pathway
    cv2.rectangle(base_bg, (0, 320), (width, 420), (120, 120, 120), -1)

    for i in range(num_frames):
        frame = base_bg.copy()
        t = i / max(1, num_frames - 1)

        if scenario_type == "child_walking":
            # Child walks across path from left (x=100) to right near water zone (x=460)
            cx = int(100 + t * 360)
            cy = 280
            ch, cw = 110, 52
            resized = cv2.resize(child_crop_np, (cw, ch))
            y1 = max(0, cy - ch)
            y2 = min(height, y1 + ch)
            x1 = max(0, cx - cw // 2)
            x2 = min(width, x1 + cw)
            frame[y1:y2, x1:x2] = resized[:y2 - y1, :x2 - x1]

        elif scenario_type == "child_running":
            # Child sprinting rapidly towards drain
            cx = int(120 + t * 400)
            cy = 290
            ch, cw = 105, 50
            resized = cv2.resize(child_run_np, (cw, ch))
            y1 = max(0, cy - ch)
            y2 = min(height, y1 + ch)
            x1 = max(0, cx - cw // 2)
            x2 = min(width, x1 + cw)
            frame[y1:y2, x1:x2] = resized[:y2 - y1, :x2 - x1]

        elif scenario_type == "child_and_adult":
            # Adult and Child walking alongside each other (supervised)
            ax = int(180 + t * 240)
            ay = 340
            ah, aw = 160, 56
            adult_resized = cv2.resize(adult_crop_np, (aw, ah))
            ay1 = max(0, ay - ah)
            ay2 = min(height, ay1 + ah)
            ax1 = max(0, ax - aw // 2)
            ax2 = min(width, ax1 + aw)
            frame[ay1:ay2, ax1:ax2] = adult_resized[:ay2 - ay1, :ax2 - ax1]

            cx = ax + 50  # 50px away (< adult_nearby_distance 90px)
            cy = 340
            ch, cw = 105, 48
            child_resized = cv2.resize(child_crop_np, (cw, ch))
            cy1 = max(0, cy - ch)
            cy2 = min(height, cy1 + ch)
            cx1 = max(0, cx - cw // 2)
            cx2 = min(width, cx1 + cw)
            frame[cy1:cy2, cx1:cx2] = child_resized[:cy2 - cy1, :cx2 - cx1]

        elif scenario_type == "child_distance_zoom":
            # Child starts far away (small, height 65px) and walks forward (height 130px)
            scale = 0.5 + t * 0.5
            ch = int(130 * scale)
            cw = int(60 * scale)
            cx = 320
            cy = int(220 + t * 120)
            resized = cv2.resize(child_crop_np, (cw, ch))
            y1 = max(0, cy - ch)
            y2 = min(height, y1 + ch)
            x1 = max(0, cx - cw // 2)
            x2 = min(width, x1 + cw)
            frame[y1:y2, x1:x2] = resized[:y2 - y1, :x2 - x1]

        elif scenario_type == "low_light":
            # Darkened frame (dusk / twilight)
            cx = int(150 + t * 300)
            cy = 300
            ch, cw = 110, 50
            resized = cv2.resize(child_crop_np, (cw, ch))
            y1 = max(0, cy - ch)
            y2 = min(height, y1 + ch)
            x1 = max(0, cx - cw // 2)
            x2 = min(width, x1 + cw)
            frame[y1:y2, x1:x2] = resized[:y2 - y1, :x2 - x1]
            # Reduce brightness by 50% for low light
            frame = cv2.convertScaleAbs(frame, alpha=0.52, beta=10)

        out.write(frame)

    out.release()
    return output_path


def run_pipeline_test():
    """Runs all 5 scenarios through the full VideoProcessor pipeline."""
    config = {
        "models": {
            "yolo_model": "models/yolov8n.pt",
            "classifier_model": "models/mobilenet_child_classifier.pth",
            "device": "auto",
            "conf_threshold": 0.18,
            "iou_threshold": 0.45
        },
        "tracking": {
            "tracker_type": "bytetrack.yaml",
            "track_high_thresh": 0.30,
            "track_low_thresh": 0.10,
            "new_track_thresh": 0.22,
            "track_buffer": 45,
            "match_thresh": 0.8
        },
        "classification": {
            "use_mobilenet": True,
            "mobilenet_conf_thresh": 0.55,
            "baseline_height_ratio_thresh": 0.35,
            "temporal_window_frames": 10
        },
        "hazard_zones": {
            "default_warning_distance": 75,
            "default_danger_distance": 25
        },
        "alerts": {
            "adult_nearby_distance": 90,
            "approach_speed_threshold": 1.5,
            "cooldown_sec": 15,
            "auto_snapshot": False,
            "database_path": "backend/safewatch.db"
        }
    }

    zm = HazardZoneManager()
    am = AlertManager(db_path="backend/safewatch.db")
    processor = VideoProcessor(config=config, zone_manager=zm, alert_manager=am)

    test_dir = Path("outputs/test_videos")
    test_dir.mkdir(parents=True, exist_ok=True)

    scenarios = [
        ("Scenario 1: Child Walking Towards Water Tank", "child_walking", "outputs/test_videos/test_child_walking.mp4"),
        ("Scenario 2: Child Running Towards Open Drain", "child_running", "outputs/test_videos/test_child_running.mp4"),
        ("Scenario 3: Adult and Child Together (Supervised)", "child_and_adult", "outputs/test_videos/test_child_and_adult.mp4"),
        ("Scenario 4: Child at Varying Camera Distances", "child_distance_zoom", "outputs/test_videos/test_child_distance_zoom.mp4"),
        ("Scenario 5: Outdoor Low-Light Evening Surveillance", "low_light", "outputs/test_videos/test_low_light.mp4")
    ]

    results_table = []

    print("\n" + "=" * 70)
    print("      SAFEWATCH AI: VIDEO PROCESSING & CLASSIFICATION TEST SUITE")
    print("=" * 70)

    for title, stype, vid_path in scenarios:
        print(f"\n[TESTING] {title}")
        print(f"Generating realistic video footage: {vid_path} ...")
        generate_scenario_video(vid_path, stype, num_frames=50)

        annotated_path = f"outputs/test_videos/annotated_{Path(vid_path).name}"
        res = processor.process_video_file(
            video_path=vid_path,
            output_annotated_path=annotated_path
        )

        summary = res["processing_summary"]
        tracks = res["unique_tracks"]
        alerts = res["alerts"]

        print(f" -> Frames Processed: {summary['frames_processed']} / {res['video_metadata']['total_frames']}")
        print(f" -> Unique People Tracked: {summary['unique_people_detected']}")
        print(f" -> Children Detected: {summary['children_detected']}")
        print(f" -> Adults Detected: {summary['adults_detected']}")
        print(f" -> Peak Risk Level: {summary['peak_status']}")
        print(f" -> Alerts Triggered: {summary['total_alerts_triggered']}")
        print(f" -> Processing FPS: {summary['processing_fps']}")

        results_table.append({
            "title": title,
            "frames": summary["frames_processed"],
            "people": summary["unique_people_detected"],
            "children": summary["children_detected"],
            "adults": summary["adults_detected"],
            "peak_status": summary["peak_status"],
            "alerts": summary["total_alerts_triggered"]
        })

    print("\n" + "=" * 75)
    print("                      TEST EXECUTION SUMMARY TABLE")
    print("=" * 75)
    print(f"{'Scenario':<42} | {'Frames':<6} | {'People':<6} | {'Child':<5} | {'Peak Status':<10}")
    print("-" * 75)
    for r in results_table:
        print(f"{r['title']:<42} | {r['frames']:<6} | {r['people']:<6} | {r['children']:<5} | {r['peak_status']:<10}")
    print("=" * 75 + "\n")


if __name__ == "__main__":
    run_pipeline_test()
