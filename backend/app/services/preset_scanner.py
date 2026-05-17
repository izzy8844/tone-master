"""
Scan Neural DSP plugin preset directories for .xml binary preset files.
Extracts preset names, UIDs, and source categories.
"""
from pathlib import Path
from typing import List
from ..config import NEURAL_DSP_PRESETS, MAPPING_DIR
from ..models import PresetInfo, PluginInfo
from .preset_uid import extract_preset_uid


def scan_plugins() -> List[PluginInfo]:
    """Scan for installed Neural DSP plugins."""
    plugins = []
    if not NEURAL_DSP_PRESETS.exists():
        return plugins

    for entry in sorted(NEURAL_DSP_PRESETS.iterdir()):
        if entry.is_dir() and not entry.name.startswith('.'):
            presets = _scan_plugin_presets_raw(entry.name)
            if presets:
                plugins.append(PluginInfo(
                    name=entry.name,
                    path=str(entry),
                    preset_count=len(presets),
                    has_mapping=_has_mapping(entry.name)
                ))
    return plugins


def scan_presets(plugin_name: str) -> List[PresetInfo]:
    """Scan presets for a specific plugin with full UID extraction."""
    raw = _scan_plugin_presets_raw(plugin_name)
    results = []
    for f in sorted(set(raw), key=lambda x: x.stem):
        info = extract_preset_uid(str(f))
        results.append(PresetInfo(
            name=info.get("name", f.stem),
            path=str(f),
            source=_get_source(plugin_name, f),
            uid=str(info.get("midi_id", "")) if info.get("midi_id") else None,
        ))
    return results


def _scan_plugin_presets_raw(plugin_name: str) -> List[Path]:
    """Walk User/, Artists/, Neural DSP/, Factory/ subdirs for .xml files."""
    plugin_dir = NEURAL_DSP_PRESETS / plugin_name
    if not plugin_dir.exists():
        return []
    presets = []
    for subdir_name in ("User", "Artists", "Neural DSP", "Factory"):
        subdir = plugin_dir / subdir_name
        if subdir.exists():
            presets.extend(subdir.rglob("*.xml"))
    # Also check Presets/ subdirectory
    pd = plugin_dir / "Presets"
    if pd.exists():
        presets.extend(pd.rglob("*.xml"))
    return presets


def _get_source(plugin_name: str, filepath: Path) -> str:
    """Determine preset source category from path."""
    plugin_dir = NEURAL_DSP_PRESETS / plugin_name
    try:
        rel = filepath.parent.relative_to(plugin_dir)
        return str(rel) if rel != Path() else "User"
    except ValueError:
        return "User"


def _has_mapping(plugin_name: str) -> bool:
    return any(MAPPING_DIR.glob(f"{plugin_name}*/*.xml")) if MAPPING_DIR.exists() else False
