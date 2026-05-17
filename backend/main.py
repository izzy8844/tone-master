import asyncio
import json
import uuid
import time
from pathlib import Path
from typing import Optional

# Patch pydub for Python 3.13+ (audioop removed)
import patch_audioop  # noqa: F401

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, File, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from audio_engine import AudioEngine
from midi_engine import MidiEngine

# Phase 1: New imports
from app.config import UPLOAD_DIR, PROJECT_DIR, MAPPING_DIR, WS_TICK_INTERVAL_MS
from app.models import (
    AutoMapRequest,
    GenerateXmlRequest,
    InstallXmlRequest,
    MidiTestRequest,
)
from app.services.preset_scanner import scan_plugins, scan_presets
from app.services.midi_xml_gen import (
    generate_xml,
    save_mapping,
    list_mappings,
    get_mapping_tones,
    delete_mapping,
    auto_map,
)
from app.services.timeline_scheduler import TimelineScheduler

# ----- App config -----
UPLOAD_DIR.mkdir(exist_ok=True)
PROJECT_DIR.mkdir(exist_ok=True)

app = FastAPI(title="ToneMaster AI Backend", version="0.2.0")

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

# Phase 1: Timeline Scheduler
def _on_scheduler_trigger(trigger):
    """Callback when a timeline trigger fires. Send MIDI + broadcast event."""
    try:
        midi_engine.send_manual_pc(
            trigger.program,
            bank=trigger.bank_msb,
            channel=0,
        )
    except Exception as e:
        print(f"[Scheduler] MIDI send error: {e}")

scheduler = TimelineScheduler(on_trigger=_on_scheduler_trigger)
_playback_task: asyncio.Task | None = None


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
        if not self.active_connections:
            return
        results = await asyncio.gather(
            *[ws.send_json(message) for ws in self.active_connections],
            return_exceptions=True
        )
        for ws, result in zip(list(self.active_connections), results):
            if isinstance(result, Exception):
                self.disconnect(ws)


manager = ConnectionManager()


# ============================================================
# REST endpoints — Existing (preserved)
# ============================================================

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
    resolved = Path(path).resolve()
    if not str(resolved).startswith(str(UPLOAD_DIR.resolve())):
        return JSONResponse({"error": "Access denied"}, status_code=403)

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


# ============================================================
# Phase 1: New REST Endpoints
# ============================================================

# --- Plugin & Preset Endpoints ---

@app.get("/api/plugins")
async def list_plugins():
    """List detected Neural DSP plugin directories."""
    plugins = scan_plugins()
    return [p.model_dump() for p in plugins]


@app.get("/api/presets")
async def list_presets(plugin: str = Query(...)):
    """List presets for a specific plugin."""
    presets = scan_presets(plugin)
    return [p.model_dump() for p in presets]


# --- MIDI Mapping Endpoints ---

@app.post("/api/midi/generate")
async def midi_generate(req: GenerateXmlRequest):
    """Generate MIDI mapping XML for a plugin."""
    xml_content, filename = generate_xml(req.plugin_name, req.mappings, req.filename)
    return {
        "xml_content": xml_content,
        "filename": filename,
        "mapping_count": len(req.mappings),
    }


@app.post("/api/midi/automap")
async def midi_automap(req: AutoMapRequest):
    """Auto-assign PC numbers and generate XML."""
    mappings = auto_map(req.preset_names, req.start_pc)
    xml_content, filename = generate_xml(req.plugin_name, mappings)
    return {
        "mappings": [m.model_dump() for m in mappings],
        "xml_content": xml_content,
        "filename": filename,
    }


@app.post("/api/midi/install")
async def midi_install(req: InstallXmlRequest):
    """Install (save) mapping XML to mappings directory."""
    try:
        path = save_mapping(req.plugin_name, req.xml_content, req.filename)
        return {"installed_path": path, "success": True}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/api/midi/test")
async def midi_test(req: MidiTestRequest):
    """Send a test MIDI Program Change message."""
    try:
        midi_engine.send_manual_pc(
            req.program,
            bank=req.bank_msb,
            channel=req.channel,
        )
        return {"success": True, "message": f"Sent PC {req.program} on ch {req.channel}"}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/api/midi/mappings")
async def midi_mappings(plugin: Optional[str] = Query(None)):
    """List saved mapping files, optionally filtered by plugin."""
    mappings = list_mappings(plugin)
    return [m.model_dump() for m in mappings]


@app.get("/api/midi/mappings/{plugin}/{filename}/tones")
async def midi_mapping_tones(plugin: str, filename: str):
    """Get parsed tones from a mapping XML file."""
    tones = get_mapping_tones(plugin, filename)
    if not tones:
        return JSONResponse({"error": "Mapping not found"}, status_code=404)
    return [t.model_dump() for t in tones]


@app.delete("/api/midi/mappings/{plugin}/{filename}")
async def midi_delete_mapping(plugin: str, filename: str):
    """Delete a mapping XML file."""
    ok = delete_mapping(plugin, filename)
    if not ok:
        return JSONResponse({"error": "File not found"}, status_code=404)
    return {"success": True}


# ----- Health check -----
@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.2.0"}


# ============================================================
# WebSocket — Enhanced with Timeline Scheduler
# ============================================================

async def playback_loop(ws: WebSocket):
    """Broadcast playback state at ~30fps + tick timeline scheduler."""
    try:
        while audio_engine.is_playing:
            # Get current state
            state = audio_engine.get_state()
            current_time = state["current_time"]
            duration = state["duration"]

            # Phase 1: Tick timeline scheduler
            current_ms = current_time * 1000
            scheduler.tick(current_ms)

            # Build enhanced broadcast: playhead_tick
            await manager.broadcast({
                "type": "playhead_tick",
                "position_ms": round(current_ms),
                "is_playing": True,
                "duration_ms": round(duration * 1000),
            })

            # Also broadcast legacy playback_state for backward compat
            await manager.broadcast(state)

            # Check MIDI engine triggers (legacy)
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
        await manager.broadcast({
            "type": "playback_state",
            "is_playing": False,
            "position_ms": 0,
        })
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
        global _playback_task
        audio_engine.play()
        if _playback_task is None or _playback_task.done():
            _playback_task = asyncio.create_task(playback_loop(ws))

    elif msg_type == "pause":
        audio_engine.pause()

    elif msg_type == "stop":
        audio_engine.stop()
        scheduler.reset()

    elif msg_type == "seek":
        if "position_ms" in msg:
            pos_s = msg["position_ms"] / 1000.0
            audio_engine.seek(pos_s)
            scheduler.reset_to(msg["position_ms"])
        elif "time" in msg:
            audio_engine.seek(msg["time"])
            scheduler.reset_to(msg["time"] * 1000)

    elif msg_type == "load_audio":
        path = msg.get("path", "")
        if path:
            audio_engine.load(path)
            await manager.broadcast({
                "type": "audio_loaded",
                "path": path,
                "duration": round(audio_engine.duration, 3),
                "duration_ms": round(audio_engine.duration * 1000),
            })
            scheduler.reset()

    elif msg_type == "update_triggers":
        triggers = msg.get("triggers", [])
        scheduler.set_triggers(triggers)
        # Also update legacy midi_engine
        midi_engine.set_triggers(triggers)
        await manager.broadcast({"type": "triggers_updated", "count": len(triggers)})

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
