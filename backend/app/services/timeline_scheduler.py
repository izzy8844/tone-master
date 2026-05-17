"""
Timeline Scheduler — fires MIDI triggers with 5ms advance compensation.
This ensures triggers fire precisely at the right time despite system latency.
"""
from dataclasses import dataclass
from typing import List, Optional, Callable


@dataclass
class TriggerPoint:
    id: str
    time_ms: float
    program: int
    name: str
    bank_msb: Optional[int] = None
    bank_lsb: Optional[int] = None
    fired: bool = False


class TimelineScheduler:
    def __init__(self, on_trigger: Callable[[TriggerPoint], None], advance_ms: float = 5.0):
        self.triggers: List[TriggerPoint] = []
        self.on_trigger = on_trigger
        self.advance_ms = advance_ms
        self._last_position_ms = 0.0

    def set_triggers(self, triggers: List[dict]):
        """Load triggers from project data. Expects list of {id, time (seconds), program/pc, name}"""
        self.triggers = [
            TriggerPoint(
                id=t["id"],
                time_ms=t["time"] * 1000,
                program=t.get("program", t.get("pc", 0)),
                name=t.get("toneName", t.get("name", "")),
                bank_msb=t.get("bank_msb"),
                bank_lsb=t.get("bank_lsb"),
            )
            for t in triggers
        ]
        self.reset()

    def tick(self, current_ms: float):
        """Called every tick. Fire triggers that fall in [last_pos, current + advance]."""
        check_ahead = current_ms + self.advance_ms
        for trigger in self.triggers:
            if trigger.fired:
                continue
            if self._last_position_ms <= trigger.time_ms <= check_ahead:
                trigger.fired = True
                self.on_trigger(trigger)
        self._last_position_ms = current_ms

    def reset(self):
        for t in self.triggers:
            t.fired = False
        self._last_position_ms = 0.0

    def reset_to(self, position_ms: float):
        """For seek/loop: unfire triggers ahead of new position."""
        self._last_position_ms = position_ms
        for t in self.triggers:
            t.fired = t.time_ms < position_ms

    def get_active_index(self, current_ms: float) -> int:
        active = -1
        for i, t in enumerate(self.triggers):
            if t.time_ms <= current_ms:
                active = i
        return active
