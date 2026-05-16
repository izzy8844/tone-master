try:
    import rtmidi
    HAS_RTMIDI = True
except ImportError:
    HAS_RTMIDI = False
    print("[MidiEngine] python-rtmidi not installed — MIDI output disabled")


class MidiEngine:
    """Manages MIDI output port and trigger-based Program Change."""

    def __init__(self) -> None:
        self._midi_out = None
        self._port_index: int = -1
        self._triggers: list[dict] = []
        self._fired_triggers: set[str] = set()
        self._last_check_time: float = 0.0
        self.current_port_name: str = ""

        if HAS_RTMIDI:
            try:
                self._midi_out = rtmidi.MidiOut()
            except Exception as e:
                print(f"[MidiEngine] Init failed: {e}")

        # Ensure _midi_out is never None for attribute checks
        if self._midi_out is None:
            # Create a dummy placeholder so hasattr checks work
            self._midi_out = _NullMidiOut()

    def list_ports(self) -> list[dict]:
        if not HAS_RTMIDI or self._midi_out is None:
            return []
        try:
            count = self._midi_out.get_port_count()
            result = []
            for i in range(count):
                result.append({"index": i, "name": self._midi_out.get_port_name(i)})
            return result
        except Exception:
            return []

    def connect(self, port_index: int) -> bool:
        if self._midi_out is None or isinstance(self._midi_out, _NullMidiOut):
            return False
        try:
            if self._port_index >= 0:
                self._midi_out.close_port()
            self._midi_out.open_port(port_index)
            self._port_index = port_index
            self.current_port_name = self._midi_out.get_port_name(port_index) if port_index >= 0 else ""
            return True
        except Exception as e:
            print(f"[MidiEngine] Connect failed: {e}")
            return False

    def connect_by_name(self, name: str) -> bool:
        ports = self.list_ports()
        for p in ports:
            if name.lower() in p["name"].lower():
                return self.connect(p["index"])
        return False

    def disconnect(self) -> None:
        try:
            if self._midi_out and not isinstance(self._midi_out, _NullMidiOut) and self._port_index >= 0:
                self._midi_out.close_port()
        except Exception:
            pass
        self._port_index = -1
        self.current_port_name = ""

    def set_triggers(self, triggers: list[dict]) -> None:
        self._triggers = sorted(triggers, key=lambda t: t.get("time", 0))
        self.reset_fired()

    def reset_fired(self) -> None:
        self._fired_triggers.clear()
        self._last_check_time = 0.0

    def check_triggers(self, current_time: float) -> list[dict]:
        """Check and fire triggers between last_check_time and current_time."""
        fired = []
        for trigger in self._triggers:
            tid = trigger.get("id", "")
            t = trigger.get("time", 0)
            if tid not in self._fired_triggers and self._last_check_time < t <= current_time:
                self._send_program_change(trigger)
                self._fired_triggers.add(tid)
                fired.append(trigger)

        self._last_check_time = current_time
        return fired

    def _send_program_change(self, trigger: dict) -> None:
        channel = 0
        program = trigger.get("program", 0) & 0x7F
        bank = trigger.get("bank")

        if self._midi_out is None or isinstance(self._midi_out, _NullMidiOut) or self._port_index < 0:
            print(f"[MidiEngine] No port — would send PC:{program} bank:{bank} ch:{channel}")
            return

        try:
            if bank is not None:
                cc_msb = [0xB0 | (channel & 0x0F), 0x00, bank & 0x7F]
                self._midi_out.send_message(cc_msb)
            pc = [0xC0 | (channel & 0x0F), program]
            self._midi_out.send_message(pc)
            print(f"[MidiEngine] Sent PC:{program} bank:{bank} ch:{channel}")
        except Exception as e:
            print(f"[MidiEngine] Send failed: {e}")

    def send_manual_pc(self, program: int, bank: int | None = None, channel: int = 0) -> None:
        self._send_program_change({"program": program, "bank": bank, "channel": channel})


class _NullMidiOut:
    """Placeholder when rtmidi is not available."""

    def get_port_count(self) -> int:
        return 0

    def get_port_name(self, _index: int) -> str:
        return ""

    def open_port(self, _index: int) -> None:
        pass

    def close_port(self) -> None:
        pass

    def send_message(self, _msg: list[int]) -> None:
        pass
