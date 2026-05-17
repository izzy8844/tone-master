"""
Timeline Scheduler — fires MIDI triggers with 5ms advance compensation.
"""
import bisect
from dataclasses import dataclass
from typing import Callable, Optional

ADVANCE_MS = 5


@dataclass
class TriggerPoint:
    id: str
    time_ms: float
    program: int
    name: str


class TimelineScheduler:
    def __init__(self, on_trigger: Optional[Callable] = None):
        self._triggers: list[TriggerPoint] = []
        self._next_index: int = 0
        self._trigger_callback = on_trigger

    def load_triggers(self, triggers: list[dict]):
        """Load and sort triggers by time_ms."""
        self._triggers = sorted([
            TriggerPoint(
                id=t.get("id", ""),
                time_ms=t.get("time_ms", t.get("time", 0) * 1000),
                program=t.get("pc_value", t.get("program", t.get("pc", 0))),
                name=t.get("name", t.get("toneName", t.get("preset_name", ""))),
            )
            for t in triggers
        ], key=lambda x: x.time_ms)
        self._next_index = 0

    def tick(self, playhead_ms: int) -> list[TriggerPoint]:
        """Called every 50ms. Returns list of fired triggers."""
        fired = []
        while self._next_index < len(self._triggers):
            t = self._triggers[self._next_index]
            if playhead_ms + ADVANCE_MS >= t.time_ms:
                fired.append(t)
                if self._trigger_callback:
                    self._trigger_callback(t)
                self._next_index += 1
            else:
                break
        return fired

    def reset_to(self, position_ms: int):
        """Find correct next_index after seek using binary search."""
        times = [t.time_ms for t in self._triggers]
        self._next_index = bisect.bisect_left(times, position_ms)

    def reset(self):
        self._next_index = 0

    @property
    def triggers(self) -> list[TriggerPoint]:
        return self._triggers
