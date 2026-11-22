"""
Child vs. Adult Classification Module for SafeWatch AI
Combines:
1. PyTorch MobileNetV2 deep learning classifier with ImageNet transfer learning.
2. Anthropometric / relative height heuristic baseline.
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
    Two-stage Child vs. Adult classifier with MobileNetV2 and anthropometric fallback,
    equipped with per-track-ID temporal probability smoothing.
    """

    CLASSES = ["Adult", "Child"]

    def __init__(
        self,
        model_path: str = "models/mobilenet_child_classifier.pth",
        use_mobilenet: bool = True,
        conf_threshold: float = 0.60,
        temporal_window: int = 10,
        baseline_height_ratio: float = 0.42,
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

            # Build MobileNetV2 architecture with 2-class classifier head
            base_model = models.mobilenet_v2(weights=None)
            in_features = base_model.classifier[1].in_features
            base_model.classifier[1] = nn.Sequential(
                nn.Dropout(p=0.2),
                nn.Linear(in_features, 2)
            )

            weights_file = Path(self.model_path)
            if not weights_file.exists():
                alt_path = Path(__file__).resolve().parent.parent / self.model_path
                if alt_path.exists():
                    weights_file = alt_path

            if weights_file.exists():
                logger.info(f"Loading trained MobileNetV2 classifier weights from {weights_file}")
                state_dict = torch.load(str(weights_file), map_location=self.device)
                base_model.load_state_dict(state_dict)
            else:
                logger.warning(
                    f"MobileNetV2 classifier weights not found at {weights_file}. "
                    "Running with heuristic baseline until model is trained via scripts/train_classifier.py."
                )

            base_model.to(self.device)
            base_model.eval()
            self.torch_model = base_model

        except Exception as e:
            logger.warning(f"Failed to load PyTorch MobileNetV2: {e}. Falling back to visual heuristics.")
            self.torch_model = None

    def reset_track(self, track_id: int) -> None:
        """Reset temporal history for a specific track ID."""
        self.temporal_history.pop(track_id, None)

    def reset_all(self) -> None:
        """Reset all temporal history."""
        self.temporal_history.clear()

    def classify(
        self,
        frame: np.ndarray,
        box: list,
        track_id: Optional[int] = None,
        frame_shape: Optional[Tuple[int, int]] = None,
        other_boxes: Optional[list] = None
    ) -> Dict[str, Any]:
        """
        Classify whether the detected person is a Child or an Adult.

        Args:
            frame: Numpy BGR image array (H, W, C)
            box: Bounding box [x1, y1, x2, y2]
            track_id: Tracking ID for temporal smoothing
            frame_shape: (height, width) of the video frame
            other_boxes: Other detected person bounding boxes in the same frame for relative scale

        Returns:
            {
                "classification": "Child" | "Adult" | "Unknown",
                "is_child": bool,
                "confidence": float,
                "raw_label": str,
                "method": "mobilenet_v2" | "heuristic"
            }
        """
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

        # 2. Heuristic fallback (relative height and aspect ratio analysis)
        if probs is None:
            method = "heuristic"
            rel_height = crop_h / max(1, fh)

            # Compare against other detected people in the frame if available
            if other_boxes and len(other_boxes) > 1:
                other_heights = [(b[3] - b[1]) for b in other_boxes]
                max_h = max(other_heights)
                # If this person's height is significantly shorter (< 72%) than the tallest person: likely child
                ratio_to_tallest = crop_h / max_h
                if ratio_to_tallest < 0.72:
                    p_child = min(0.85, 0.5 + (0.75 - ratio_to_tallest))
                    p_adult = 1.0 - p_child
                elif ratio_to_tallest > 0.88:
                    p_adult = min(0.90, 0.5 + (ratio_to_tallest - 0.8))
                    p_child = 1.0 - p_adult
                else:
                    p_child = 0.5
                    p_adult = 0.5
            else:
                # Absolute frame ratio heuristic
                if rel_height < self.baseline_height_ratio:
                    p_child = min(0.85, 0.5 + (self.baseline_height_ratio - rel_height) * 1.5)
                    p_adult = 1.0 - p_child
                else:
                    p_adult = min(0.88, 0.5 + (rel_height - self.baseline_height_ratio) * 1.5)
                    p_child = 1.0 - p_adult

            probs = np.array([p_adult, p_child])

        # 3. Apply Temporal Smoothing across consecutive frames for this track ID
        if track_id is not None:
            if track_id not in self.temporal_history:
                self.temporal_history[track_id] = deque(maxlen=self.temporal_window)

            self.temporal_history[track_id].append(probs)

            # Compute moving average of probabilities
            history_matrix = np.array(self.temporal_history[track_id])
            smoothed_probs = np.mean(history_matrix, axis=0)
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
