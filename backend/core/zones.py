"""
Hazard Zone Management & Computational Geometry Module for SafeWatch AI
Handles custom polygon zones (water tank, road, open drain) using OpenCV pointPolygonTest.
"""
from typing import List, Dict, Any, Tuple, Optional
import sqlite3
import json
import logging
import cv2
import numpy as np

logger = logging.getLogger("safewatch.zones")

DEFAULT_ZONES = [
    {
        "id": "zone-1",
        "name": "Open Water Tank / Pool",
        "type": "water",
        "polygon": [
            [420, 120],
            [600, 130],
            [620, 290],
            [430, 280]
        ],
        "warning_distance": 75,
        "danger_distance": 25,
        "color": "#0284c7",
        "enabled": True,
        "description": "Underground cistern & outdoor water tank perimeter"
    },
    {
        "id": "zone-2",
        "name": "Main Road Frontage",
        "type": "road",
        "polygon": [
            [40, 360],
            [640, 350],
            [640, 470],
            [40, 470]
        ],
        "warning_distance": 85,
        "danger_distance": 30,
        "color": "#f97316",
        "enabled": True,
        "description": "Unfenced property border facing active two-lane vehicular street"
    },
    {
        "id": "zone-3",
        "name": "Open Storm Drain Trench",
        "type": "drain",
        "polygon": [
            [60, 110],
            [180, 110],
            [220, 310],
            [80, 310]
        ],
        "warning_distance": 65,
        "danger_distance": 20,
        "color": "#9333ea",
        "enabled": True,
        "description": "Uncovered municipal concrete rainwater culvert"
    }
]


class HazardZoneManager:
    """
    Manages custom hazard perimeters and computes point-to-polygon distances.
    Stores and syncs zones with SQLite database.
    """

    def __init__(self, db_path: str = "safewatch.db", default_w: int = 680, default_h: int = 480):
        self.db_path = db_path
        self.default_w = default_w
        self.default_h = default_h
        self.zones: List[Dict[str, Any]] = []

        self._init_db()
        self.load_zones()

    def _init_db(self) -> None:
        """Initialize SQLite hazard_zones table."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS hazard_zones (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        type TEXT NOT NULL,
                        polygon_json TEXT NOT NULL,
                        warning_distance REAL DEFAULT 75.0,
                        danger_distance REAL DEFAULT 25.0,
                        color TEXT DEFAULT '#0284c7',
                        enabled INTEGER DEFAULT 1,
                        description TEXT DEFAULT ''
                    )
                """)
                conn.commit()

                # Check if table is empty; seed with default presets
                cursor.execute("SELECT COUNT(*) FROM hazard_zones")
                count = cursor.fetchone()[0]
                if count == 0:
                    logger.info("Seeding database with default hazard zones (Water Tank, Road, Drain)...")
                    for z in DEFAULT_ZONES:
                        cursor.execute("""
                            INSERT INTO hazard_zones (id, name, type, polygon_json, warning_distance, danger_distance, color, enabled, description)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            z["id"],
                            z["name"],
                            z["type"],
                            json.dumps(z["polygon"]),
                            z["warning_distance"],
                            z["danger_distance"],
                            z["color"],
                            1 if z["enabled"] else 0,
                            z["description"]
                        ))
                    conn.commit()

        except Exception as e:
            logger.error(f"Error initializing zones database: {e}", exc_info=True)

    def load_zones(self) -> List[Dict[str, Any]]:
        """Load all hazard zones from SQLite."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM hazard_zones")
                rows = cursor.fetchall()

                loaded: List[Dict[str, Any]] = []
                for row in rows:
                    loaded.append({
                        "id": row["id"],
                        "name": row["name"],
                        "type": row["type"],
                        "polygon": json.loads(row["polygon_json"]),
                        "warning_distance": float(row["warning_distance"]),
                        "danger_distance": float(row["danger_distance"]),
                        "color": row["color"],
                        "enabled": bool(row["enabled"]),
                        "description": row["description"]
                    })

                self.zones = loaded if loaded else list(DEFAULT_ZONES)
                return self.zones

        except Exception as e:
            logger.error(f"Error loading zones from DB: {e}")
            self.zones = list(DEFAULT_ZONES)
            return self.zones

    def get_all(self) -> List[Dict[str, Any]]:
        """Return cached list of hazard zones."""
        return self.zones

    def save_zone(self, zone_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Insert or update a hazard zone in SQLite and memory."""
        try:
            zone_id = zone_data.get("id") or f"zone-{int(cv2.getTickCount())}"
            name = zone_data.get("name", "Custom Hazard Zone")
            z_type = zone_data.get("type", "water")
            polygon = zone_data.get("polygon", [])
            warn_dist = float(zone_data.get("warning_distance", 75.0))
            dang_dist = float(zone_data.get("danger_distance", 25.0))
            color = zone_data.get("color", "#0284c7")
            enabled = 1 if zone_data.get("enabled", True) else 0
            description = zone_data.get("description", "")

            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO hazard_zones (id, name, type, polygon_json, warning_distance, danger_distance, color, enabled, description)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        name=excluded.name,
                        type=excluded.type,
                        polygon_json=excluded.polygon_json,
                        warning_distance=excluded.warning_distance,
                        danger_distance=excluded.danger_distance,
                        color=excluded.color,
                        enabled=excluded.enabled,
                        description=excluded.description
                """, (
                    zone_id, name, z_type, json.dumps(polygon),
                    warn_dist, dang_dist, color, enabled, description
                ))
                conn.commit()

            self.load_zones()
            return self.zones

        except Exception as e:
            logger.error(f"Error saving zone: {e}", exc_info=True)
            return self.zones

    def delete_zone(self, zone_id: str) -> List[Dict[str, Any]]:
        """Delete a zone by ID."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM hazard_zones WHERE id = ?", (zone_id,))
                conn.commit()

            self.load_zones()
            return self.zones

        except Exception as e:
            logger.error(f"Error deleting zone: {e}", exc_info=True)
            return self.zones

    def reset_defaults(self) -> List[Dict[str, Any]]:
        """Reset zones table to initial presets."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM hazard_zones")
                for z in DEFAULT_ZONES:
                    cursor.execute("""
                        INSERT INTO hazard_zones (id, name, type, polygon_json, warning_distance, danger_distance, color, enabled, description)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        z["id"], z["name"], z["type"], json.dumps(z["polygon"]),
                        z["warning_distance"], z["danger_distance"], z["color"], 1, z["description"]
                    ))
                conn.commit()

            self.load_zones()
            return self.zones

        except Exception as e:
            logger.error(f"Error resetting default zones: {e}")
            return self.zones

    def compute_proximity(
        self,
        foot_point: Tuple[int, int],
        frame_shape: Optional[Tuple[int, int]] = None
    ) -> Tuple[float, Optional[Dict[str, Any]], bool, str]:
        """
        Compute shortest Euclidean distance from a person's foot point to all active hazard perimeters
        using OpenCV's pointPolygonTest.

        Args:
            foot_point: (x, y) ground contact coordinates
            frame_shape: (height, width) for normalized coordinate scaling if applicable

        Returns:
            (min_distance_px, nearest_zone, is_inside, alert_level)
            where alert_level is "SAFE", "WARNING", or "DANGER"
        """
        fx, fy = foot_point
        min_dist = float("inf")
        nearest_zone: Optional[Dict[str, Any]] = None
        is_inside_any = False

        active_zones = [z for z in self.zones if z.get("enabled", True) and len(z.get("polygon", [])) >= 3]

        if not active_zones:
            return 999.0, None, False, "SAFE"

        for zone in active_zones:
            polygon = zone["polygon"]

            # Scale if polygon is normalized [0, 1]
            pts = []
            for p in polygon:
                px, py = p[0], p[1]
                if frame_shape and 0.0 <= px <= 1.0 and 0.0 <= py <= 1.0:
                    px = int(px * frame_shape[1])
                    py = int(py * frame_shape[0])
                pts.append([int(px), int(py)])

            np_poly = np.array(pts, dtype=np.int32)

            # cv2.pointPolygonTest measureDist=True:
            # Positive value = inside polygon
            # Zero = on polygon edge
            # Negative value = outside polygon (-distance)
            test_val = cv2.pointPolygonTest(np_poly, (float(fx), float(fy)), True)

            if test_val >= 0:
                # Inside hazard zone!
                eff_dist = 0.0
                is_inside = True
            else:
                eff_dist = abs(float(test_val))
                is_inside = False

            if eff_dist < min_dist:
                min_dist = eff_dist
                nearest_zone = zone
                if is_inside:
                    is_inside_any = True

        # Determine alert level based on nearest zone's thresholds
        alert_level = "SAFE"
        if nearest_zone is not None:
            danger_thresh = nearest_zone.get("danger_distance", 25.0)
            warn_thresh = nearest_zone.get("warning_distance", 75.0)

            if is_inside_any or min_dist <= danger_thresh:
                alert_level = "DANGER"
            elif min_dist <= warn_thresh:
                alert_level = "WARNING"
            else:
                alert_level = "SAFE"

        return round(min_dist, 1), nearest_zone, is_inside_any, alert_level
