"""
Alert Management, Cooldowns, SQLite Storage & Telegram Notifications for SafeWatch AI
Handles incident dispatch, snapshot capturing, and alert lifecycle.
"""
from pathlib import Path
from typing import List, Dict, Any, Optional
import os
import sqlite3
import time
import io
import csv
import threading
import logging
import requests
import cv2

logger = logging.getLogger("safewatch.alerts")


class AlertManager:
    """
    Manages security alerts, cooldown intervals, SQLite persistence,
    snapshot saving, and automated Telegram bot dispatch.
    """

    def __init__(
        self,
        db_path: str = "safewatch.db",
        snapshots_dir: str = "outputs/snapshots",
        cooldown_sec: float = 15.0,
        telegram_token: str = "",
        telegram_chat_id: str = ""
    ):
        self.db_path = db_path
        self.snapshots_dir = Path(snapshots_dir)
        self.cooldown_sec = cooldown_sec
        self.telegram_token = telegram_token or os.environ.get("TELEGRAM_BOT_TOKEN", "")
        self.telegram_chat_id = telegram_chat_id or os.environ.get("TELEGRAM_CHAT_ID", "")

        # Cooldown tracker: { (person_label, zone_name): last_alert_timestamp }
        self.cooldowns: Dict[tuple, float] = {}

        self.snapshots_dir.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self) -> None:
        """Initialize SQLite alerts table."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS alerts (
                        id TEXT PRIMARY KEY,
                        timestamp TEXT NOT NULL,
                        child_id TEXT NOT NULL,
                        person_id INTEGER,
                        zone_name TEXT NOT NULL,
                        zone_type TEXT NOT NULL,
                        level TEXT NOT NULL,
                        distance_px REAL DEFAULT 0.0,
                        speed REAL DEFAULT 0.0,
                        acknowledged INTEGER DEFAULT 0,
                        snapshot_url TEXT,
                        notes TEXT DEFAULT ''
                    )
                """)
                conn.commit()
        except Exception as e:
            logger.error(f"Error initializing alerts DB: {e}", exc_info=True)

    def is_in_cooldown(self, person_label: str, zone_name: str) -> bool:
        """Check if an alert for this person/zone pair is currently in cooldown."""
        key = (person_label, zone_name)
        now = time.time()
        last_t = self.cooldowns.get(key, 0.0)
        return (now - last_t) < self.cooldown_sec

    def trigger_alert(
        self,
        person_eval: Dict[str, Any],
        frame: Optional[Any] = None,
        notes: str = ""
    ) -> Optional[Dict[str, Any]]:
        """
        Record a critical DANGER alert, capture snapshot, and dispatch Telegram notification.
        Enforces alert cooldown.

        Returns recorded alert record or None if suppressed by cooldown.
        """
        label = person_eval.get("label", "Child-01")
        zone_name = person_eval.get("zone_name", "Hazard Perimeter")
        zone_type = person_eval.get("zone", "water")
        level = person_eval.get("level", "DANGER")

        if level != "DANGER":
            return None

        now = time.time()
        if self.is_in_cooldown(label, zone_name):
            return None

        # Update cooldown timestamp
        self.cooldowns[(label, zone_name)] = now

        alert_id = f"alt-{int(now * 1000)}"
        timestamp_iso = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(now))

        snapshot_filename = None
        snapshot_url = None
        snapshot_path = None

        # 1. Save Incident Snapshot
        if frame is not None and frame.size > 0:
            try:
                snapshot_filename = f"snapshot_{alert_id}.jpg"
                snapshot_path = self.snapshots_dir / snapshot_filename
                cv2.imwrite(str(snapshot_path), frame)
                snapshot_url = f"/snapshots/{snapshot_filename}"
            except Exception as e:
                logger.error(f"Failed to write snapshot image: {e}")

        default_notes = notes or f"Critical Alert: {label} breached {zone_name} perimeter ({person_eval.get('distance_px', 0)}px)"

        alert_record = {
            "id": alert_id,
            "timestamp": timestamp_iso,
            "child_id": label,
            "person_id": person_eval.get("id", 1),
            "zone_name": zone_name,
            "zone_type": zone_type,
            "level": level,
            "distance_px": float(person_eval.get("distance_px", 0.0)),
            "speed": float(person_eval.get("speed", 0.0)),
            "acknowledged": False,
            "snapshot_url": snapshot_url,
            "notes": default_notes
        }

        # 2. Persist to SQLite
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO alerts (id, timestamp, child_id, person_id, zone_name, zone_type, level, distance_px, speed, acknowledged, snapshot_url, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    alert_record["id"],
                    alert_record["timestamp"],
                    alert_record["child_id"],
                    alert_record["person_id"],
                    alert_record["zone_name"],
                    alert_record["zone_type"],
                    alert_record["level"],
                    alert_record["distance_px"],
                    alert_record["speed"],
                    0,
                    alert_record["snapshot_url"],
                    alert_record["notes"]
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Error inserting alert into DB: {e}")

        # 3. Asynchronous Telegram Dispatch
        if self.telegram_token and self.telegram_chat_id:
            threading.Thread(
                target=self._send_telegram_alert,
                args=(alert_record, snapshot_path),
                daemon=True
            ).start()

        return alert_record

    def _send_telegram_alert(self, alert_record: Dict[str, Any], photo_path: Optional[Path]) -> None:
        """Send Telegram notification message and optional photo via Telegram Bot API."""
        try:
            caption = (
                f"🚨 <b>SAFEWATCH CRITICAL DANGER ALERT</b> 🚨\n\n"
                f"⚠️ <b>Subject:</b> {alert_record['child_id']}\n"
                f"📍 <b>Hazard:</b> {alert_record['zone_name']} ({alert_record['zone_type'].upper()})\n"
                f"📏 <b>Distance:</b> {alert_record['distance_px']} px\n"
                f"🏃 <b>Velocity:</b> {alert_record['speed']} m/s\n"
                f"⏰ <b>Time:</b> {alert_record['timestamp']}\n\n"
                f"<i>Immediate guardian intervention required!</i>"
            )

            if photo_path and photo_path.exists():
                url = f"https://api.telegram.org/bot{self.telegram_token}/sendPhoto"
                with open(photo_path, "rb") as f:
                    response = requests.post(
                        url,
                        data={
                            "chat_id": self.telegram_chat_id,
                            "caption": caption,
                            "parse_mode": "HTML"
                        },
                        files={"photo": f},
                        timeout=10
                    )
            else:
                url = f"https://api.telegram.org/bot{self.telegram_token}/sendMessage"
                response = requests.post(
                    url,
                    json={
                        "chat_id": self.telegram_chat_id,
                        "text": caption,
                        "parse_mode": "HTML"
                    },
                    timeout=10
                )

            if response.status_code == 200:
                logger.info("Telegram alert dispatched successfully.")
            else:
                logger.warning(f"Telegram API response [{response.status_code}]: {response.text}")

        except Exception as e:
            logger.error(f"Failed to dispatch Telegram alert: {e}")

    def get_alerts(self, limit: int = 200) -> List[Dict[str, Any]]:
        """Retrieve recent alerts sorted descending by timestamp."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ?",
                    (limit,)
                )
                rows = cursor.fetchall()

                return [
                    {
                        "id": r["id"],
                        "timestamp": r["timestamp"],
                        "child_id": r["child_id"],
                        "person_id": r["person_id"],
                        "zone_name": r["zone_name"],
                        "zone_type": r["zone_type"],
                        "level": r["level"],
                        "distance_px": float(r["distance_px"]),
                        "speed": float(r["speed"]),
                        "acknowledged": bool(r["acknowledged"]),
                        "snapshot_url": r["snapshot_url"],
                        "notes": r["notes"]
                    }
                    for r in rows
                ]
        except Exception as e:
            logger.error(f"Error fetching alerts: {e}")
            return []

    def acknowledge_alert(self, alert_id: str) -> bool:
        """Mark an alert as acknowledged in SQLite."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("UPDATE alerts SET acknowledged = 1 WHERE id = ?", (alert_id,))
                conn.commit()
                return cursor.rowcount > 0
        except Exception as e:
            logger.error(f"Error acknowledging alert: {e}")
            return False

    def clear_all(self) -> bool:
        """Delete all alert records."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM alerts")
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error clearing alerts: {e}")
            return False

    def export_csv(self) -> str:
        """Generate CSV string of all alert records."""
        alerts = self.get_alerts(limit=1000)
        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow([
            "Alert ID", "Timestamp", "Person Label", "Hazard Zone",
            "Zone Type", "Severity Level", "Distance (px)", "Speed (m/s)",
            "Acknowledged", "Snapshot URL", "Notes"
        ])

        for a in alerts:
            writer.writerow([
                a["id"],
                a["timestamp"],
                a["child_id"],
                a["zone_name"],
                a["zone_type"],
                a["level"],
                a["distance_px"],
                a["speed"],
                "Yes" if a["acknowledged"] else "No",
                a["snapshot_url"] or "",
                a["notes"]
            ])

        return output.getvalue()
