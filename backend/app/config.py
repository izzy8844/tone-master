"""
ToneMaster AI Backend Configuration — path auto-detection with env-var overrides.

Environment variables:
  TONEMASTER_PRESETS_DIR   → override Neural DSP preset scan root
  TONEMASTER_CONFIG_DIR    → override Neural DSP MIDI mappings install root
  TONEMASTER_UPLOAD_DIR    → override audio upload directory
  TONEMASTER_PROJECTS_DIR  → override projects data directory
"""
import os
import platform
from pathlib import Path

SYSTEM = platform.system()
PROJECT_ROOT = Path(__file__).parent.parent.parent


def _find_neural_dsp_presets_dir() -> Path:
    """Auto-detect the Neural DSP presets root directory."""
    env_override = os.environ.get("TONEMASTER_PRESETS_DIR")
    if env_override:
        return Path(env_override)

    candidates: list[Path] = []

    if SYSTEM == "Darwin":
        candidates = [
            Path(os.path.expanduser("~/Library/Audio/Presets/Neural DSP")),
            Path("/Library/Audio/Presets/Neural DSP"),
            Path(os.path.expanduser("~/Documents/Neural DSP")),
            Path(os.path.expanduser("~/Music/Neural DSP")),
        ]
    else:  # Windows / Linux
        home = Path.home()
        candidates = [
            home / "Documents" / "Neural DSP",
            Path(r"C:\ProgramData\Neural DSP"),
            Path(r"C:\Users\Public\Documents\Neural DSP"),
            home / "OneDrive" / "Documents" / "Neural DSP",  # OneDrive redirected Documents
            home / "Neural DSP",                               # custom root install
            # Also scan all drives for Neural DSP
            *[Path(f"{d}:/ProgramData/Neural DSP") for d in "CDEFG" if Path(f"{d}:/ProgramData/Neural DSP").exists()],
        ]

    for candidate in candidates:
        if candidate.exists():
            # Verify it actually contains plugin subdirectories (not just an empty dir)
            subdirs = [d for d in candidate.iterdir() if d.is_dir() and not d.name.startswith('.')]
            if subdirs:
                print(f"[config] Detected Neural DSP presets: {candidate}")
                return candidate

    # Last resort: try the most common default anyway
    fallback = home / "Documents" / "Neural DSP" if SYSTEM != "Darwin" else Path(os.path.expanduser("~/Library/Audio/Presets/Neural DSP"))
    print(f"[config] No Neural DSP presets found, using fallback: {fallback}")
    return fallback


def _find_neural_dsp_config_dir() -> Path:
    """Auto-detect the Neural DSP Application Support / config root."""
    env_override = os.environ.get("TONEMASTER_CONFIG_DIR")
    if env_override:
        return Path(env_override)

    home = Path.home()

    if SYSTEM == "Darwin":
        cfg = home / "Library" / "Application Support" / "Neural DSP"
        cfg.mkdir(parents=True, exist_ok=True)
        return cfg

    # Windows: APPDATA is the canonical location for per-user config
    appdata = os.environ.get("APPDATA", str(home / "AppData" / "Roaming"))
    cfg = Path(appdata) / "Neural DSP"
    if not cfg.exists():
        # Fallback: try LocalAppData
        local = os.environ.get("LOCALAPPDATA", str(home / "AppData" / "Local"))
        cfg_alt = Path(local) / "Neural DSP"
        if cfg_alt.exists():
            cfg = cfg_alt
    cfg.mkdir(parents=True, exist_ok=True)
    print(f"[config] Neural DSP config dir: {cfg}")
    return cfg


# ── Resolved paths ────────────────────────────────────────────────────────────

NEURAL_DSP_PRESETS = _find_neural_dsp_presets_dir()
NEURAL_DSP_USER_CONFIG = _find_neural_dsp_config_dir()
MIDI_MAPPINGS_BASE = NEURAL_DSP_USER_CONFIG

UPLOAD_DIR = Path(os.environ.get("TONEMASTER_UPLOAD_DIR", str(PROJECT_ROOT / "data" / "uploads")))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

PROJECTS_DIR = Path(os.environ.get("TONEMASTER_PROJECTS_DIR", str(PROJECT_ROOT / "data" / "projects")))
PROJECTS_DIR.mkdir(parents=True, exist_ok=True)

MAPPING_DIR = PROJECT_ROOT / "mappings"
MAPPING_DIR.mkdir(parents=True, exist_ok=True)

# ── Constants ─────────────────────────────────────────────────────────────────

AUDIO_SUPPORTED_FORMATS = [".wav", ".mp3", ".m4a", ".ogg", ".flac", ".aac", ".wma"]
AUDIO_MAX_SIZE_MB = 50
MIDI_DEFAULT_CHANNEL = 0
WS_TICK_INTERVAL_MS = 50
SCHEDULER_ADVANCE_MS = 5
