import asyncio
import json
import uuid
import time
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, File, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from audio_engine import AudioEngine
from midi_engine import MidiEngine

# ----- App config -----
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(title="ToneMaster AI Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----- Engines -----
audio_engine = AudioEngine()
midi_engine = MidiEngine()


# ----- WebSocket connection manager -----
class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.active_connections.append(ws)

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self.active_connections:
            self.active_connections.remove(ws)

    async def broadcast(self, message: dict) -> None:
        dead: list[WebSocket] = []
        for ws in self.active_connections:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()


# ----- REST endpoints -----
@app.post("/api/audio/upload")
async def upload_audio(file: UploadFile = File(...)):
    ALLOWED_EXT = {".wav", ".mp3", ".flac", ".ogg", ".m4a", ".aac"}
    ext = Path(file.filename or "").suffix.lower()

    if ext not in ALLOWED_EXT:
        return JSONResponse(
            {"error": f"Unsupported format: {ext}"}, status_code=400
        )

    file_id = uuid.uuid4().hex
    filename = f"{file_id}{ext}"
    filepath = UPLOAD_DIR / filename

    content = await file.read()
    filepath.write_bytes(content)

    duration_sec = audio_engine.load(str(filepath))

    return {
        "success": True,
        "file_id": file_id,
        "filename": filename,
        "path": str(filepath),
        "duration_sec": round(duration_sec, 3),
    }


@app.get("/api/audio/waveform")
async def get_waveform(path: str = Query(...), num_peaks: int = Query(800, ge=100, le=4000)):
    if not Path(path).exists():
        return JSONResponse({"error": "File not found"}, status_code=404)

    peaks = audio_engine.get_waveform_peaks(path, num_peaks)
    return {"peaks": peaks, "num_peaks": len(peaks)}


@app.get("/api/midi/ports")
async def list_midi_ports():
    ports = midi_engine.list_ports()
    return {"ports": ports}


@app.post("/api/midi/connect")
async def connect_midi_port(port_index: int = Query(...)):
    ok = midi_engine.connect(port_index)
    if not ok:
        return JSONResponse({"error": "Failed to connect"}, status_code=400)
    return {"name": midi_engine.current_port_name, "index": port_index}


# ----- Health check -----
@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}


# ----- WebSocket endpoint -----
async def playback_loop(ws: WebSocket):
    """Broadcast playback state at ~30fps."""
    try:
        while audio_engine.is_playing:
            state = audio_engine.get_state()
            await manager.broadcast(state)

            # Check MIDI triggers
            current_time = audio_engine.current_time
            fired = midi_engine.check_triggers(current_time)
            for trigger in fired:
                await manager.broadcast({
                    "type": "trigger_fired",
                    "trigger_id": trigger.get("id"),
                    "program": trigger.get("program"),
                    "tone_name": trigger.get("toneName", ""),
                })

            await asyncio.sleep(1 / 30)

        # Final state after stop
        state = audio_engine.get_state()
        await manager.broadcast(state)
    except Exception as e:
        print(f"[PlaybackLoop] Error: {e}")


async def handle_ws_message(ws: WebSocket, msg: dict) -> None:
    msg_type = msg.get("type", "")

    # Unwrap playback_command
    if msg_type == "playback_command":
        command = msg.get("command", "")
        msg = {"type": command, "position_ms": msg.get("position_ms"), "time": msg.get("time"), "path": msg.get("path")}

    msg_type = msg.get("type", "")

    if msg_type == "play":
        audio_engine.play()
        asyncio.create_task(playback_loop(ws))

    elif msg_type == "pause":
        audio_engine.pause()

    elif msg_type == "stop":
        audio_engine.stop()

    elif msg_type == "seek":
        if "position_ms" in msg:
            audio_engine.seek(msg["position_ms"] / 1000.0)
        elif "time" in msg:
            audio_engine.seek(msg["time"])

    elif msg_type == "load_audio":
        path = msg.get("path", "")
        if path:
            audio_engine.load(path)
            await manager.broadcast({
                "type": "audio_loaded",
                "path": path,
                "duration": round(audio_engine.duration, 3),
            })

    elif msg_type == "set_triggers":
        midi_engine.set_triggers(msg.get("triggers", []))

    elif msg_type == "set_midi_port":
        name = msg.get("name", "")
        if name:
            midi_engine.connect_by_name(name)

    # Broadcast current state after every command
    await manager.broadcast(audio_engine.get_state())


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)

    # Send initial state
    await ws.send_json(audio_engine.get_state())

    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
                await handle_ws_message(ws, msg)
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[WS] Error: {e}")
    finally:
        manager.disconnect(ws)


# ----- Startup -----
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8765, reload=True)
