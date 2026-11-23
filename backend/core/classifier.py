"""
Child vs. Adult Classification Module for SafeWatch AI
Combines:
1. PyTorch MobileNetV2 deep learning classifier with ImageNet transfer learning.
2. Anthropometric / relative height, aspect ratio & perspective heuristic baseline.
3. Temporal exponential smoothing across consecutive tracking frames.

ETHICAL / TECHNICAL DISCLAIMER:
This module performs visual age-group estimation (Child vs. Adult) solely for safety hazard
proximity alerting in perimeter surveillance. Visual appearance does NOT verify an individual's
legal or biological age. When uncertain, the system classifies the person as UNKNOWN.
"""
from collections import deque
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
import logging
import numpy as np

logger = logging.getLogger("safewatch.classifier")


class ChildAdultClassifier:
    """
    Two-stage Child vs. Adult classifier with MobileNetV2 and anthropometric validation,
    equipped with per-track-ID temporal probability smoothing and feature caching.
    """

    CLASSES = ["Adult", "Child"]

    def __init__(
        self,
        model_path: str = "models/mobilenet_child_classifier.pth",
        use_mobilenet: bool = True,
        conf_threshold: float = 0.58,
        temporal_window: int = 10,
        baseline_height_ratio: float = 0.38,
        device: str = "auto"
    ):
        self.model_path = model_path
        self.use_mobilenet = use_mobilenet
        self.conf_threshold = conf_threshold
        self.temporal_window = temporal_window
        self.baseline_height_ratio = baseline_height_ratio
        self.device = self._resolve_device(device)

        self.torch_model = None
        self.transform = None

        # Temporal probability history: { track_id: deque([ [prob_adult, prob_child], ... ], maxlen=10) }
        self.temporal_history: Dict[int, deque] = {}
        # Per-track prediction cache to avoid running heavy CNN on every single frame:
        # { track_id: {"probs": np.ndarray, "frame_num": int, "method": str} }
        self.track_cache: Dict[int, Dict[str, Any]] = {}
        self.frame_index = 0

        if self.use_mobilenet:
            self._load_mobilenet()

    def _resolve_device(self, device: str) -> str:
        """Resolve PyTorch device."""
        if device == "auto":
            try:
                import torch
                if torch.cuda.is_available():
                    return "cuda"
            except Exception:
                pass
            return "cpu"
        return device

    def _load_mobilenet(self) -> None:
        """Load trained MobileNetV2 model if available on disk."""
        try:
            import torch
            import torch.nn as nn
            from torchvision import models, transforms

            # Standard ImageNet pre-processing
            self.transform = transforms.Compose([
                transforms.ToPILImage(),
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(
                    mean=[0.485, 0.456, 0.406],
                    std=[0.229, 0.224, 0.225]
                )
            ])

            weights_file = Path(self.model_path)
            if not weights_file.exists():
                alt_path = Path(__file__).resolve().parent.parent / self.model_path
                if alt_path.exists():
                    weights_file = alt_path

            base_model = models.mobilenet_v2(weights=None)
            in_features = base_model.classifier[1].in_features

            if weights_file.exists():
                logger.info(f"Loading trained MobileNetV2 classifier weights from {weights_file}")
                state_dict = torch.load(str(weights_file), map_location=self.device)

                # Check if trained with 2-layer or 1-layer head
                if "classifier.1.4.weight" in state_dict or "classifier.1.3.weight" in state_dict:
                    base_model.classifier[1] = nn.Sequential(
                        nn.Dropout(p=0.25),
                        nn.Linear(in_features, 64),
                        nn.ReLU(inplace=True),
                        nn.Dropout(p=0.2),
                        nn.Linear(64, 2)
                    )
                else:
                    base_model.classifier[1] = nn.Sequential(
                        nn.Dropout(p=0.2),
                        nn.Linear(in_features, 2)
                    )

                base_model.load_state_dict(state_dict)
            else:
                logger.warning(
                    f"MobileNetV2 classifier weights not found at {weights_file}. "
                    "Running with heuristic baseline until model is trained via scripts/train_classifier.py."
                )
                base_model.classifier[1] = nn.Sequential(
                    nn.Dropout(p=0.2),
                    nn.Linear(in_features, 2)
                )

            base_model.to(self.device)
            base_model.eval()
            self.torch_model = base_model

        except Exception as e:
            logger.warning(f"Failed to load PyTorch MobileNetV2: {e}. Falling back to visual heuristics.")
            self.torch_model = None

    def reset_track(self, track_id: int) -> None:
        """Reset temporal history and cache for a specific track ID."""
        self.temporal_history.pop(track_id, None)
        self.track_cache.pop(track_id, None)

    def reset_all(self) -> None:
        """Reset all temporal history and cache."""
        self.temporal_history.clear()
        self.track_cache.clear()
        self.frame_index = 0

    def classify(
        self,
        frame: np.ndarray,
        box: list,
        track_id: Optional[int] = None,
        frame_shape: Optional[Tuple[int, int]] = None,
        other_boxes: Optional[list] = None
    ) -> Dict[str, Any]:
        """
        Classify whether the detected person is a Child, Adult, or Unknown.
        Applies MobileNetV2 deep visual feature classification with anthropometric validation
        and multi-frame temporal smoothing.
        """
        self.frame_index += 1
        x1, y1, x2, y2 = box
        fh, fw = frame_shape if frame_shape else (frame.shape[0], frame.shape[1])

        # Clamp crop coordinates inside frame boundaries
        cx1 = max(0, min(fw - 1, x1))
        cy1 = max(0, min(fh - 1, y1))
        cx2 = max(0, min(fw, x2))
        cy2 = max(0, min(fh, y2))

        crop_h = cy2 - cy1
        crop_w = cx2 - cx1

        if crop_h < 15 or crop_w < 10:
            return {
                "classification": "Unknown",
                "is_child": False,
                "confidence": 0.5,
                "raw_label": "Unknown",
                "method": "insufficient_pixels"
            }

        # Check track cache: re-run CNN every 6 frames or when newly tracked
        use_cached = False
        if track_id is not None and track_id in self.track_cache:
            cache_entry = self.track_cache[track_id]
            frames_since = self.frame_index - cache_entry["frame_num"]
            if frames_since < 6:
                probs = cache_entry["probs"]
                method = cache_entry["method"]
                use_cached = True

        if not use_cached:
            probs = None
            method = "heuristic"

            # 1. Try PyTorch MobileNetV2 inference if weights are loaded
            if self.torch_model is not None and self.transform is not None:
                try:
                    import torch

                    crop_bgr = frame[cy1:cy2, cx1:cx2]
                    # Convert BGR to RGB
                    crop_rgb = crop_bgr[:, :, ::-1].copy()

                    input_tensor = self.transform(crop_rgb).unsqueeze(0).to(self.device)

                    with torch.no_grad():
                        logits = self.torch_model(input_tensor)
                        probabilities = torch.softmax(logits, dim=1).cpu().numpy()[0]
                        # probabilities: [p_adult, p_child]
                        probs = probabilities
                        method = "mobilenet_v2"
                except Exception as e:
                    logger.debug(f"MobileNet inference failed, falling back to heuristic: {e}")
                    probs = None

            # 2. Anthropometric Heuristic Fusion
            # Children have higher aspect ratio (width/height ~0.42 to 0.58), shorter stature.
            # Adults have lower aspect ratio (width/height ~0.28 to 0.38), taller stature.
            aspect_ratio = crop_w / max(1, crop_h)
            rel_height = crop_h / max(1, fh)

            # Ground contact depth perspective normalization:
            # People lower down (higher y2) are closer to the camera.
            # Expected height ratio at ground y2:
            ground_norm = max(0.2, min(1.0, y2 / max(1, fh)))
            calibrated_stature = rel_height / ground_norm

            h_prob_child = 0.5
            if other_boxes and len(other_boxes) > 1:
                # Compare against other detected people at similar ground depth
                other_heights = [
                    (b[3] - b[1]) for b in other_boxes
                    if abs(b[3] - y2) < (0.25 * fh)
                ]
                if other_heights:
                    max_nearby_h = max(other_heights)
                    ratio_to_tallest = crop_h / max(1, max_nearby_h)
                    if ratio_to_tallest < 0.74:
                        h_prob_child = min(0.92, 0.55 + (0.74 - ratio_to_tallest) * 1.5)
                    elif ratio_to_tallest > 0.88:
                        h_prob_child = max(0.08, 0.45 - (ratio_to_tallest - 0.88) * 1.5)
            else:
                # Single person in scene: calibrated stature + aspect ratio
                if calibrated_stature < 0.32 or rel_height < 0.24:
                    # Short stature at this ground depth indicates child
                    h_prob_child = 0.85
                elif calibrated_stature > 0.52 or rel_height > 0.44:
                    # Tall stature indicates adult
                    h_prob_child = 0.15
                elif aspect_ratio > 0.40:
                    # Moderate stature with broader child stance
                    h_prob_child = 0.74
                elif aspect_ratio < 0.30 and calibrated_stature > 0.40:
                    # Slender and tall
                    h_prob_child = 0.20
                else:
                    # Intermediate: safety-critical default leans towards child vigilance
                    h_prob_child = 0.60

            h_prob_adult = 1.0 - h_prob_child
            heuristic_probs = np.array([h_prob_adult, h_prob_child])

            if probs is not None:
                # If MobileNet is confident, weight it heavily (75%), otherwise blend 50/50
                mn_conf = max(probs[0], probs[1])
                mn_weight = 0.75 if mn_conf > 0.70 else 0.50
                h_weight = 1.0 - mn_weight

                fused_adult = mn_weight * probs[0] + h_weight * heuristic_probs[0]
                fused_child = mn_weight * probs[1] + h_weight * heuristic_probs[1]
                probs = np.array([fused_adult, fused_child])
                method = "mobilenet_v2+anthropometrics"
            else:
                probs = heuristic_probs
                method = "anthropometrics"

            # Update track cache
            if track_id is not None:
                self.track_cache[track_id] = {
                    "probs": probs,
                    "frame_num": self.frame_index,
                    "method": method
                }

        # 3. Apply Temporal Smoothing across consecutive frames for this track ID
        if track_id is not None:
            if track_id not in self.temporal_history:
                self.temporal_history[track_id] = deque(maxlen=self.temporal_window)

            self.temporal_history[track_id].append(probs)

            # Exponentially weighted moving average giving more weight to recent detections
            history_list = list(self.temporal_history[track_id])
            weights = np.exp(np.linspace(-1.0, 0.0, len(history_list)))
            weights /= np.sum(weights)
            smoothed_probs = np.average(history_list, axis=0, weights=weights)
        else:
            smoothed_probs = probs

        p_adult, p_child = smoothed_probs[0], smoothed_probs[1]

        # 4. Apply Confidence Thresholding
        top_idx = int(np.argmax(smoothed_probs))
        top_conf = float(smoothed_probs[top_idx])

        if top_conf < self.conf_threshold:
            classification = "Unknown"
            is_child = False
        else:
            classification = self.CLASSES[top_idx]
            is_child = (classification == "Child")

        return {
            "classification": classification,
            "is_child": is_child,
            "confidence": round(top_conf, 3),
            "raw_label": self.CLASSES[top_idx],
            "method": method
        }
