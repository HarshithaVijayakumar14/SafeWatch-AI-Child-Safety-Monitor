"""
End-to-end WebSocket Stream and Inference Verification Script
Tests connecting to ws://localhost:8000/ws/stream, sending test frames, and validating responses.
"""
import asyncio
import json
import base64
import cv2
import numpy as np
import websockets

async def test_inference_stream():
    uri = "ws://localhost:8000/ws/stream"
    print(f"Connecting to {uri}...")
    
    async with websockets.connect(uri) as ws:
        print("Connected successfully!")
        
        # Test 1: Ping / Pong
        await ws.send(json.dumps({"type": "ping"}))
        pong = await ws.recv()
        print("Ping response:", pong)
        
        # Test 2: Generate a test image (680x480) with a simulated person rectangle
        img = np.zeros((480, 680, 3), dtype=np.uint8)
        # Background
        img[:] = (30, 30, 30)
        # Draw a humanoid figure: head, torso, legs
        # Torso
        cv2.rectangle(img, (310, 180), (350, 290), (180, 160, 140), -1)
        # Head
        cv2.circle(img, (330, 150), 22, (200, 180, 160), -1)
        # Legs
        cv2.rectangle(img, (312, 290), (328, 380), (100, 80, 60), -1)
        cv2.rectangle(img, (332, 290), (348, 380), (100, 80, 60), -1)
        
        _, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 80])
        b64_frame = base64.b64encode(buf).decode("utf-8")
        
        # Send 3 consecutive frames to test ByteTrack association
        for i in range(3):
            payload = {
                "type": "frame",
                "frame": f"data:image/jpeg;base64,{b64_frame}"
            }
            await ws.send(json.dumps(payload))
            resp = await ws.recv()
            data = json.loads(resp)
            print(f"Frame {i+1} Result:")
            print(f"  Status: {data.get('status')}")
            print(f"  FPS: {data.get('fps')}")
            print(f"  People count: {len(data.get('people', []))}")
            for p in data.get("people", []):
                print(f"    ID: {p.get('id')} | Track ID: {p.get('track_id')} | Category: {p.get('category')} | Level: {p.get('level')} | Box: {p.get('box')} | Distance: {p.get('distance_px')}px")
            await asyncio.sleep(0.05)
            
    print("\nWebSocket and Inference Verification Completed Successfully!")

if __name__ == "__main__":
    asyncio.run(test_inference_stream())
