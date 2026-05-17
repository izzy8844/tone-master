import platform
from pathlib import Path

SYSTEM = platform.system()  # "Darwin" or "Windows"

# Neural DSP preset directories — check multiple possible locations
if SYSTEM == "Darwin":
    _POSSIBLE_NEURAL_DSP_PATHS = [
        Path.home() / "Documents" / "Neural DSP",
        Path.home() / "Library" / "Audio" / "Presets" / "Neural DSP",
        Path("/Library/Audio/Presets/Neural DSP"),
        Path.home() / "Music" / "Neural DSP",
    ]
else:
    _POSSIBLE_NEURAL_DSP_PATHS = [
        Path.home() / "Documents" / "Neural DSP",
        Path(r"C:\Users\Public\Documents\Neural DSP"),
    ]

# Use the first path that exists, or default to ~/Documents/Neural DSP
NEURAL_DSP_PRESETS = next(
    (p for p in _POSSIBLE_NEURAL_DSP_PATHS if p.exists()),
    Path.home() / "Documents" / "Neural DSP"
)

# App directories
UPLOAD_DIR = Path("uploads")
PROJECT_DIR = Path("projects")
MAPPING_DIR = Path("mappings")

# Ensure directories exist
for d in [UPLOAD_DIR, PROJECT_DIR, MAPPING_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# WebSocket config
WS_TICK_INTERVAL_MS = 33  # ~30fps
SCHEDULER_ADVANCE_MS = 5  # Fire triggers 5ms early to compensate latency

# Audio config
SUPPORTED_AUDIO = [".mp3", ".wav", ".flac", ".ogg", ".m4a"]
