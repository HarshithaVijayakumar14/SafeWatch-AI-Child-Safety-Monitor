"""
Movement Vector Analysis & Guardian Supervision Risk Engine for SafeWatch AI
Evaluates trajectory dynamics, approach velocities, and multi-actor adult proximity.
"""
from typing import List, Dict, Any, Tuple, Optional
import math
import logging

logger = logging.getLogger("safewatch.logic")


class SafetyLogicEngine:
    """
    Evaluates kinematic trajectory vectors, approach velocity towards hazard perimeters,
    and calculates guardian proximity supervision status.
    """

    def __init__(
        self,
        adult_nearby_distance: float = 90.0,
        approach_speed_threshold: float = 1.5,  # m/s equivalent or scaled px/s
        fps_estimate: float = 25.0
    ):
        self.adult_nearby_distance = adult_nearby_distance
        self.approach_speed_threshold = approach_speed_threshold
        self.fps_estimate = fps_estimate

    def analyze_movement(
        self,
        trajectory: List[Tuple[int, int, float]],
        nearest_zone: Optional[Dict[str, Any]]
    ) -> Tuple[str, float]:
        """
        Compute movement direction and pixel velocity from trajectory history.

        Args:
            trajectory: List of past (x, y, timestamp) coordinates
            nearest_zone: Hazard zone dictionary with polygon

        Returns:
            (direction_str, speed_mps)
            where direction_str is "APPROACHING", "RECEDING", or "STATIONARY"
            and speed_mps is estimated speed in meters/second (scaled from px/s)
        """
        if not trajectory or len(trajectory) < 2:
            return "STATIONARY", 0.0

        p_latest = trajectory[-1]
        p_earlier = trajectory[0] if len(trajectory) < 6 else trajectory[-6]

        dx = p_latest[0] - p_earlier[0]
        dy = p_latest[1] - p_earlier[1]

        if len(p_latest) >= 3 and len(p_earlier) >= 3:
            dt = p_latest[2] - p_earlier[2]
        else:
            steps = min(len(trajectory) - 1, 6)
            dt = steps / self.fps_estimate

        if dt <= 0.001:
            dt = 1.0 / self.fps_estimate

        dist_px = math.sqrt(dx * dx + dy * dy)
        speed_px_per_sec = dist_px / dt

        # Scaled conversion: assume typical camera view ~100px ~= 1 meter
        speed_mps = round(speed_px_per_sec / 100.0, 2)

        if dist_px < 6.0:
            return "STATIONARY", speed_mps

        if nearest_zone is None or "polygon" not in nearest_zone:
            return "MOVING", speed_mps

        # Compute zone centroid
        poly = nearest_zone["polygon"]
        zx = sum(p[0] for p in poly) / len(poly)
        zy = sum(p[1] for p in poly) / len(poly)

        # Vector from latest position to hazard centroid
        to_zone_x = zx - p_latest[0]
        to_zone_y = zy - p_latest[1]
        to_zone_mag = math.sqrt(to_zone_x * to_zone_x + to_zone_y * to_zone_y)

        if to_zone_mag < 1.0:
            return "APPROACHING", speed_mps

        # Normalized dot product (cosine similarity between velocity vector and to-zone vector)
        dot = (dx * to_zone_x + dy * to_zone_y) / (dist_px * to_zone_mag)

        if dot > 0.35:
            direction = "APPROACHING"
        elif dot < -0.35:
            direction = "RECEDING"
        else:
            direction = "TANGENTIAL"

        return direction, speed_mps

    def evaluate_person(
        self,
        person_track: Dict[str, Any],
        is_child: bool,
        distance_to_hazard: float,
        nearest_zone: Optional[Dict[str, Any]],
        is_inside_hazard: bool,
        base_zone_level: str,
        adult_foot_points: List[Tuple[int, int]],
        trajectory: List[Tuple[int, int, float]]
    ) -> Dict[str, Any]:
        """
        Evaluate full risk status for a single tracked person considering
        movement dynamics, proximity to hazard zones, and adult guardian presence.

        Returns comprehensive person evaluation payload matching frontend contract.
        """
        foot_point = person_track.get("foot_point", (0, 0))
        track_id = person_track.get("track_id", 0)

        # 1. Analyze Kinematics
        direction, speed_mps = self.analyze_movement(trajectory, nearest_zone)

        # 2. Compute Proximity to Nearest Adult
        min_dist_to_adult: Optional[float] = None
        is_supervised = False

        if is_child and adult_foot_points:
            distances = [
                math.hypot(foot_point[0] - ax, foot_point[1] - ay)
                for ax, ay in adult_foot_points
            ]
            if distances:
                min_dist_to_adult = min(distances)
                if min_dist_to_adult <= self.adult_nearby_distance:
                    is_supervised = True

        # 3. Determine Risk Level
        # CRITICAL RULE: Adult presence can suppress WARNING to SUPERVISED,
        # but MUST NOT suppress DANGER if child has entered or breached the hazard zone!
        final_level = "SAFE"

        if is_child:
            if base_zone_level == "DANGER" or is_inside_hazard:
                final_level = "DANGER"
            elif base_zone_level == "WARNING":
                if is_supervised:
                    final_level = "SUPERVISED"
                else:
                    final_level = "WARNING"
                    # Escalation: If rapidly approaching hazard, elevate to high alert
                    if direction == "APPROACHING" and speed_mps >= self.approach_speed_threshold:
                        final_level = "WARNING"
            elif is_supervised:
                final_level = "SAFE"
            else:
                final_level = "SAFE"
        else:
            # Adults in or near hazard are noted as SAFE or low-risk supervised
            final_level = "SAFE"

        return {
            "id": track_id,
            "label": f"Child-{track_id:02d}" if is_child else f"Adult-{track_id:02d}",
            "box": person_track["box"],
            "is_child": is_child,
            "level": final_level,
            "zone": nearest_zone["type"] if nearest_zone else None,
            "zone_name": nearest_zone["name"] if nearest_zone else None,
            "distance_px": round(distance_to_hazard),
            "speed": speed_mps,
            "direction": direction,
            "dist_to_adult": round(min_dist_to_adult) if min_dist_to_adult is not None else None,
            "is_supervised": is_supervised
        }
