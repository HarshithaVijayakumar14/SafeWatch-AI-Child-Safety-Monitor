"""
Real-Time WebSocket Inference Stream Handler for SafeWatch AI
Handles bi-directional video streaming between React frontend and Python AI engine.
"""
from typing import Optional
import json
import base64
import time
import logging
import cv2
import numpy as np
from fastapi import WebSocket, WebSocketDisconnect

from core.processor import VideoProcessor

logger = logging.getLogger("safewatch.api.websocket")


async def websocket_endpoint(websocket: WebSocket, processor: VideoProcessor):
    """
    WebSocket endpoint for real-time video frame processing.
    Accepts incoming camera/video frames from React, executes YOLOv8 ByteTrack,
    MobileNetV2 classification, and hazard proximity calculations, then emits detection JSON.
    """
    await websocket.accept()
    logger.info("New WebSocket client connected to /ws/stream")

    client_id = f"client-{int(time.time()*1000)}"

    try:
        while True:
            # Receive either text (JSON with base64) or binary data
            message = await websocket.receive()

            if "text" in message:
                text_data = message["text"]
                try:
                    payload = json.loads(text_data)
                except Exception:
                    continue

                msg_type = payload.get("type", "frame")

                # Handle ping/pong keepalive
                if msg_type == "ping":
                    await websocket.send_json({"type": "pong", "timestamp": time.time()})
                    continue

                # Handle reset command
                if msg_type == "reset":
                    processor.reset_stream()
                    await websocket.send_json({"type": "reset_ack", "status": "RESET"})
                    continue

                # Handle frame message
                frame_data = payload.get("frame")
                if not frame_data:
                    continue

                # Strip data:image/...;base64, header if present
                if "," in frame_data:
                    frame_data = frame_data.split(",", 1)[1]

                try:
                    img_bytes = base64.b64decode(frame_data)
                    np_arr = np.frombuffer(img_bytes, np.uint8)
                    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
                except Exception as e:
                    logger.warning(f"Error decoding base64 image: {e}")
                    continue

                if frame is None or frame.size == 0:
                    continue

                # Run inference through complete safety pipeline
                result = processor.process_frame(frame, return_annotated=False)

                # Send back structured metadata
                await websocket.send_json(result)

            elif "bytes" in message:
                # Direct binary JPEG frame
                raw_bytes = message["bytes"]
                try:
                    np_arr = np.frombuffer(raw_bytes, np.uint8)
                    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
                except Exception as e:
                    logger.warning(f"Error decoding binary frame: {e}")
                    continue

                if frame is None or frame.size == 0:
                    continue

                result = processor.process_frame(frame, return_annotated=False)
                await websocket.send_json(result)

    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected: {client_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        try:
            await websocket.close()
        except Exception:
            pass
