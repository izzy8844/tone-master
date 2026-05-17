"""MIDI output controller with virtual port support."""
try:
    import mido
    HAS_MIDO = True
except ImportError:
    HAS_MIDO = False

_virtual_port = None


def get_virtual_port():
    """Create or return singleton virtual MIDI port."""
    global _virtual_port
    if not HAS_MIDO:
        return None
    if _virtual_port is None:
        try:
            _virtual_port = mido.open_output('ToneMaster Virtual', virtual=True)
        except Exception:
            _virtual_port = None
    return _virtual_port


def send_pc(port_name: str, pc_value: int, channel: int = 0):
    """Send Program Change to specified MIDI port."""
    if not HAS_MIDO:
        print(f"[MIDI] mido not installed — would send PC:{pc_value} to {port_name}")
        return
    try:
        if port_name == 'ToneMaster Virtual' or not port_name:
            port = get_virtual_port()
        else:
            port = mido.open_output(port_name)
        msg = mido.Message('program_change', program=max(0, min(127, pc_value)), channel=channel)
        port.send(msg)
        if port_name != 'ToneMaster Virtual' and port_name:
            port.close()
    except Exception as e:
        print(f"[MIDI] send_pc error: {e}")


def list_available_outputs() -> list[str]:
    """List all MIDI output ports including virtual port."""
    if not HAS_MIDO:
        return []
    ports = list(mido.get_output_names())
    if 'ToneMaster Virtual' not in ports:
        ports.insert(0, 'ToneMaster Virtual')
    return ports
