import os
import platform
from pathlib import Path

SYSTEM = platform.system()
PROJECT_ROOT = Path(__file__).parent.parent.parent

if SYSTEM == "Darwin":
    _POSSIBLE_NEURAL_DSP_PATHS = [
        Path("/Library/Audio/Presets/Neural DSP"),
        Path(os.path.expanduser("~/Library/Audio/Presets/Neural DSP")),
        Path(os.path.expanduser("~/Documents/Neural DSP")),
        Path(os.path.expanduser("~/Music/Neural DSP")),
    ]
else:
    _POSSIBLE_NEURAL_DSP_PATHS = [
        Path(os.path.expanduser("~/Documents/Neural DSP")),
        Path(r"C:\ProgramData\Neural DSP"),
        Path(r"C:\Users\Public\Documents\Neural DSP"),
    ]

NEURAL_DSP_PRESETS = next((p for p in _POSSIBLE_NEURAL_DSP_PATHS if p.exists()),
                          Path(os.path.expanduser("~/Documents/Neural DSP")))

if SYSTEM == "Darwin":
    NEURAL_DSP_USER_CONFIG = Path(os.path.expanduser("~/Library/Application Support/Neural DSP"))
else:
    NEURAL_DSP_USER_CONFIG = Path(os.path.expanduser(r"~\AppData\Roaming\Neural DSP"))

UPLOAD_DIR = PROJECT_ROOT / "data" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

PROJECTS_DIR = PROJECT_ROOT / "data" / "projects"
PROJECTS_DIR.mkdir(parents=True, exist_ok=True)

MAPPING_DIR = Path("mappings")
MAPPING_DIR.mkdir(parents=True, exist_ok=True)

AUDIO_SUPPORTED_FORMATS = [".wav", ".mp3", ".m4a", ".ogg", ".flac", ".aac", ".wma"]
AUDIO_MAX_SIZE_MB = 50
MIDI_DEFAULT_CHANNEL = 0
WS_TICK_INTERVAL_MS = 50
SCHEDULER_ADVANCE_MS = 5
