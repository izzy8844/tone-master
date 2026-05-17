import platform
from pathlib import Path

SYSTEM = platform.system()  # "Darwin" or "Windows"

# Neural DSP plugin preset directories
if SYSTEM == "Darwin":
    NEURAL_DSP_BASE = Path.home() / "Music" / "Neural DSP"
    NEURAL_DSP_PRESETS = Path.home() / "Documents" / "Neural DSP"
else:
    NEURAL_DSP_BASE = Path.home() / "Documents" / "Neural DSP"
    NEURAL_DSP_PRESETS = NEURAL_DSP_BASE

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
