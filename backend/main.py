"""
ToneMaster AI Backend — Real audio engine + WebSocket + Project persistence.
"""
import asyncio
import json
import platform
import threading
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

# Patch pydub for Python 3.13+
import patch_audioop  # noqa: F401

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import UPLOAD_DIR, PROJECTS_DIR, AUDIO_SUPPORTED_FORMATS, AUDIO_MAX_SIZE_MB, MAPPING_DIR
from app.services.audio_engine import AudioEngine
from app.services.ws_manager import ws_manager
from app.services.project_manager import (
    create_project, list_projects, get_project, update_project, delete_project, duplicate_project,
)
from app.services.timeline_scheduler import TimelineScheduler, TriggerPoint
from app.services.preset_scanner import scan_plugins, scan_presets
from app.services.midi_xml_gen import generate_xml, save_mapping, list_mappings, get_mapping_tones, delete_mapping, auto_map
from app.services.midi_learn_guide import start_session, get_current_step, execute_step, get_results
from app.models import AutoMapRequest, GenerateXmlRequest, InstallXmlRequest, MidiTestRequest

# ----- Global state -----
audio = AudioEngine()
scheduler: TimelineScheduler | None = None
_stop_event = threading.Event()
_playback_thread: threading.Thread | None = None
_main_loop: asyncio.AbstractEventLoop | None = None
_loop_state = {"enabled": False, "start_ms": None, "end_ms": None}
_midi_port_name: str | None = None


def _on_trigger_fire(trigger):
    """Called by scheduler when trigger fires — broadcast via WS."""
    if _main_loop and _main_loop.is_running():
        asyncio.run_coroutine_threadsafe(
            ws_manager.broadcast_trigger({"id": trigger.id, "pc": trigger.program, "name": trigger.name, "time_ms": trigger.time_ms}),
            _main_loop
        )


def _playback_loop():
    """Runs in dedicated thread, ticks every 50ms."""
    while not _stop_event.is_set():
        try:
            if not audio.is_playing:
                _stop_event.wait(0.05)
                continue

            playhead = audio.playhead_ms

            # Fire triggers
            if scheduler:
                fired = scheduler.tick(playhead)
                for t in fired:
                    try:
                        from app.services.midi_controller import send_pc
                        send_pc(_midi_port_name or "", t.program)
                    except Exception:
                        pass

            # AB Loop check
            if _loop_state.get("enabled") and _loop_state.get("end_ms"):
                if playhead >= _loop_state["end_ms"]:
                    start = _loop_state.get("start_ms", 0)
                    audio.seek(start)
                    if scheduler:
                        scheduler.reset_to(start)
                    continue

            # End of track
            if audio.duration_ms > 0 and playhead >= audio.duration_ms:
                audio.stop()
                if scheduler:
                    scheduler.reset()
                if _main_loop and _main_loop.is_running():
                    asyncio.run_coroutine_threadsafe(ws_manager.broadcast_playback_state(False), _main_loop)
                break

            _stop_event.wait(0.05)
        except Exception as e:
            print(f"[PlaybackLoop] Error: {e}")


def _ensure_playback_thread():
    global _playback_thread
    if _playback_thread is None or not _playback_thread.is_alive():
        _stop_event.clear()
        _playback_thread = threading.Thread(target=_playback_loop, daemon=True)
        _playback_thread.start()


# ----- App -----
@asynccontextmanager
async def lifespan(app: FastAPI):
    global _main_loop
    _main_loop = asyncio.get_running_loop()
    ws_manager.set_playhead_provider(lambda: audio.playhead_ms)
    playhead_task = asyncio.create_task(ws_manager.broadcast_playhead())
    yield
    playhead_task.cancel()
    _stop_event.set()
    audio.stop()
    await ws_manager.close_all()


app = FastAPI(title="ToneMaster AI Backend", version="0.3.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Audio endpoints
# ============================================================

@app.post("/api/audio/upload")
async def upload_audio(file: UploadFile):
    ext = Path(file.filename or "audio.wav").suffix.lower()
    if ext not in AUDIO_SUPPORTED_FORMATS:
        return JSONResponse({"error": f"Unsupported format: {ext}"}, status_code=400)
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > AUDIO_MAX_SIZE_MB:
        return JSONResponse({"error": f"File too large: {size_mb:.1f}MB (max {AUDIO_MAX_SIZE_MB}MB)"}, status_code=400)

    filepath = UPLOAD_DIR / file.filename
    filepath.write_bytes(content)

    return {"success": True, "filename": file.filename, "path": str(filepath), "size_mb": round(size_mb, 2)}


@app.get("/api/audio/uploads")
async def list_uploads():
    files = []
    for f in sorted(UPLOAD_DIR.iterdir()):
        ext = f.suffix.lower()
        if ext in AUDIO_SUPPORTED_FORMATS:
            files.append({"name": f.name, "path": str(f), "size_kb": round(f.stat().st_size / 1024, 1)})
    return {"files": files}


@app.get("/api/audio/waveform")
async def get_waveform(path: str = Query(...), num_peaks: int = Query(800, ge=100, le=4000)):
    resolved = Path(path).resolve()
    if not str(resolved).startswith(str(UPLOAD_DIR.resolve())):
        return JSONResponse({"error": "Access denied"}, status_code=403)
    peaks = audio.get_waveform_peaks(path, num_peaks)
    return {"peaks": peaks, "num_peaks": len(peaks), "duration_ms": audio.duration_ms}


# ============================================================
# Project CRUD
# ============================================================

@app.post("/api/projects")
async def api_create_project(body: dict):
    p = create_project(body.get("name", "Untitled"), body.get("audio"), body.get("device"))
    return {"project": p}


@app.get("/api/projects")
async def api_list_projects():
    return {"projects": list_projects()}


@app.get("/api/projects/{project_id}")
async def api_get_project(project_id: str):
    p = get_project(project_id)
    if p is None:
        return JSONResponse({"error": "Not found"}, status_code=404)
    return {"project": p}


@app.put("/api/projects/{project_id}")
async def api_update_project(project_id: str, body: dict):
    p = update_project(project_id, body)
    if p is None:
        return JSONResponse({"error": "Not found"}, status_code=404)
    return {"project": p}


@app.delete("/api/projects/{project_id}")
async def api_delete_project(project_id: str):
    ok = delete_project(project_id)
    return {"success": ok}


@app.post("/api/projects/{project_id}/duplicate")
async def api_duplicate_project(project_id: str, body: dict = {}):
    p = duplicate_project(project_id, body.get("name"))
    if p is None:
        return JSONResponse({"error": "Not found"}, status_code=404)
    return {"project": p}


# ============================================================
# Plugin & MIDI endpoints (existing)
# ============================================================

@app.get("/api/plugins")
async def list_plugins():
    return [p.model_dump() for p in scan_plugins()]


@app.get("/api/presets")
async def list_presets(plugin: str = Query(...)):
    return [p.model_dump() for p in scan_presets(plugin)]


@app.get("/api/midi/ports")
async def list_midi_ports():
    try:
        from app.services.midi_controller import list_available_outputs
        ports = list_available_outputs()
    except Exception:
        ports = []
    return {"ports": [{"index": i, "name": p} for i, p in enumerate(ports)]}


@app.post("/api/midi/connect")
async def connect_midi_port(port_index: int = Query(...)):
    try:
        from app.services.midi_controller import list_available_outputs
        ports = list_available_outputs()
        if 0 <= port_index < len(ports):
            global _midi_port_name
            _midi_port_name = ports[port_index]
            return {"name": _midi_port_name, "index": port_index}
    except Exception:
        pass
    return JSONResponse({"error": "Failed"}, status_code=400)


@app.post("/api/midi/generate")
async def midi_generate(req: GenerateXmlRequest):
    xml_content, filename = generate_xml(req.plugin_name, req.mappings, req.filename)
    return {"xml_content": xml_content, "filename": filename, "mapping_count": len(req.mappings)}


@app.post("/api/midi/automap")
async def midi_automap(req: AutoMapRequest):
    mappings = auto_map(req.preset_names, req.start_pc)
    xml_content, filename = generate_xml(req.plugin_name, mappings)
    return {"mappings": [m.model_dump() for m in mappings], "xml_content": xml_content, "filename": filename}


@app.post("/api/midi/install")
async def midi_install(req: InstallXmlRequest):
    try:
        path = save_mapping(req.plugin_name, req.xml_content, req.filename)
        return {"installed_path": path, "success": True}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/api/midi/test")
async def midi_test(req: MidiTestRequest):
    try:
        from app.services.midi_controller import send_pc
        send_pc(_midi_port_name or "", req.program, req.channel)
        return {"success": True}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/api/midi/mappings")
async def midi_mappings(plugin: str | None = Query(None)):
    return [m.model_dump() for m in list_mappings(plugin)]


@app.get("/api/midi/mappings/{plugin}/{filename}/tones")
async def midi_mapping_tones(plugin: str, filename: str):
    tones = get_mapping_tones(plugin, filename)
    if not tones:
        return JSONResponse({"error": "Not found"}, status_code=404)
    return [t.model_dump() for t in tones]


@app.delete("/api/midi/mappings/{plugin}/{filename}")
async def midi_delete_mapping(plugin: str, filename: str):
    ok = delete_mapping(plugin, filename)
    if not ok:
        return JSONResponse({"error": "Not found"}, status_code=404)
    return {"success": True}


# ============================================================
# MIDI Learn Guide
# ============================================================

@app.post("/api/midi/learn/start")
async def learn_start(body: dict):
    sess = start_session(body.get("plugin", ""), body.get("preset_names", []), body.get("port_name", ""))
    return {"session_id": sess.session_id, "total": sess.total}


@app.get("/api/midi/learn/{session_id}/step")
async def learn_step(session_id: str):
    step = get_current_step(session_id)
    if step is None:
        return JSONResponse({"error": "Session not found"}, status_code=404)
    return step


@app.post("/api/midi/learn/{session_id}/execute")
async def learn_execute(session_id: str):
    result = execute_step(session_id)
    if result is None:
        return JSONResponse({"error": "Session not found"}, status_code=404)
    return result


@app.get("/api/midi/learn/{session_id}/results")
async def learn_results(session_id: str):
    results = get_results(session_id)
    if results is None:
        return JSONResponse({"error": "Session not found"}, status_code=404)
    return {"results": results}


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.3.0", "playing": audio.is_playing}


# ============================================================
# WebSocket
# ============================================================

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    global scheduler, _loop_state, _midi_port_name
    await ws_manager.connect(ws)
    await ws.send_text(json.dumps({"type": "playback_state", "playing": audio.is_playing, "position_ms": audio.playhead_ms, "duration_ms": audio.duration_ms}))

    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get("type", "")

            if msg_type == "playback_command":
                cmd = msg.get("command", "")
                if cmd == "play":
                    _ensure_playback_thread()
                    audio.play()
                elif cmd == "pause":
                    audio.pause()
                elif cmd == "stop":
                    audio.stop()
                    if scheduler:
                        scheduler.reset()
                elif cmd == "seek":
                    pos = msg.get("position_ms", 0)
                    audio.seek(int(pos))
                    if scheduler:
                        scheduler.reset_to(int(pos))

            elif msg_type == "load_audio":
                path = msg.get("path", "")
                if path:
                    ok = audio.load(path)
                    await ws.send_text(json.dumps({
                        "type": "audio_loaded",
                        "path": path,
                        "duration_ms": audio.duration_ms,
                        "success": ok,
                    }))

            elif msg_type == "load_timeline":
                triggers = msg.get("triggers", [])
                port_name = msg.get("port_name", _midi_port_name or "")
                scheduler = TimelineScheduler(on_trigger=_on_trigger_fire)
                scheduler.load_triggers(triggers)
                _midi_port_name = port_name

            elif msg_type == "set_loop":
                _loop_state = {
                    "enabled": msg.get("enabled", True),
                    "start_ms": msg.get("start_ms"),
                    "end_ms": msg.get("end_ms"),
                }

            elif msg_type == "ack":
                pass  # Client heartbeat, ignore

            elif msg_type == "clear_loop":
                _loop_state = {"enabled": False, "start_ms": None, "end_ms": None}

            elif msg_type == "update_triggers":
                triggers = msg.get("triggers", [])
                if scheduler is None:
                    scheduler = TimelineScheduler(on_trigger=_on_trigger_fire)
                scheduler.load_triggers(triggers)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[WS] Error: {e}")
    finally:
        ws_manager.disconnect(ws)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8765)
