"""
SafeWatch AI Backend - Core Computer Vision & Safety Logic Engine
"""
from .detector import YOLOv8PersonDetector
from .tracker import PersonTracker
from .classifier import ChildAdultClassifier
from .zones import HazardZoneManager
from .logic import SafetyLogicEngine
from .alerts import AlertManager
from .processor import VideoProcessor

__all__ = [
    "YOLOv8PersonDetector",
    "PersonTracker",
    "ChildAdultClassifier",
    "HazardZoneManager",
    "SafetyLogicEngine",
    "AlertManager",
    "VideoProcessor"
]
