"""Dedicated WebSocket connection manager with broadcasting."""
import asyncio
import json
import time
from fastapi import WebSocket


class WSManager:
    def __init__(self):
        self._connections: list[WebSocket] = []
        self._playhead_callback = None

    def set_playhead_provider(self, callback):
        self._playhead_callback = callback

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self._connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self._connections:
            self._connections.remove(websocket)

    async def broadcast_playhead(self):
        """Background task: broadcast playhead every 50ms."""
        while True:
            if self._connections and self._playhead_callback:
                payload = {
                    "type": "playhead_tick",
                    "playhead_ms": self._playhead_callback(),
                    "server_time_ns": time.time_ns(),
                }
                await self._broadcast(payload)
            await asyncio.sleep(0.05)

    async def broadcast_trigger(self, trigger: dict):
        payload = {"type": "midi_trigger", "trigger": trigger, "server_time_ns": time.time_ns()}
        await self._broadcast(payload)

    async def broadcast_playback_state(self, playing: bool):
        await self._broadcast({"type": "playback_state", "playing": playing})

    async def _broadcast(self, data: dict):
        dead = []
        for ws in self._connections:
            try:
                await ws.send_text(json.dumps(data))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    async def close_all(self):
        for ws in self._connections[:]:
            try:
                await ws.close()
            except Exception:
                pass
        self._connections.clear()

    @property
    def active_connections(self):
        return self._connections


ws_manager = WSManager()
