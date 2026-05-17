"""MIDI output controller with cached port connections and virtual port support."""
try:
    import mido
    HAS_MIDO = True
except ImportError:
    HAS_MIDO = False

_virtual_port = None
_port_cache: dict[str, object] = {}


def init_virtual_port():
    """Create virtual MIDI port on startup so DAWs see it immediately."""
    global _virtual_port
    if not HAS_MIDO:
        return False
    try:
        _virtual_port = mido.open_output('ToneMaster Virtual', virtual=True)
        return True
    except Exception:
        return False


def get_virtual_port():
    global _virtual_port
    if _virtual_port is None:
        init_virtual_port()
    return _virtual_port


def send_pc(port_name: str, pc_value: int, channel: int = 0):
    if not HAS_MIDO:
        return
    try:
        target = port_name or 'ToneMaster Virtual'
        if target == 'ToneMaster Virtual':
            port = get_virtual_port()
        else:
            if target not in _port_cache:
                _port_cache[target] = mido.open_output(target)
            port = _port_cache[target]
        msg = mido.Message('program_change', program=max(0, min(127, pc_value)), channel=channel)
        port.send(msg)
    except Exception as e:
        print(f"[MIDI] send_pc error: {e}")


def list_available_outputs() -> list[str]:
    if not HAS_MIDO:
        return []
    ports = list(mido.get_output_names())
    if 'ToneMaster Virtual' not in ports:
        ports.insert(0, 'ToneMaster Virtual')
    return ports


def cleanup():
    global _port_cache, _virtual_port
    for p in _port_cache.values():
        try: p.close()
        except: pass
    _port_cache = {}
    if _virtual_port:
        try: _virtual_port.close()
        except: pass
    _virtual_port = None
