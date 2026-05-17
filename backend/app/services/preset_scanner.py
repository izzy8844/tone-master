"""
Scan Neural DSP plugin directories to find installed presets.
Presets are .ndspp binary files in various possible locations.
"""
import os
from pathlib import Path
from typing import List
from ..config import NEURAL_DSP_PRESETS, MAPPING_DIR
from ..models import PresetInfo, PluginInfo


def scan_plugins() -> List[PluginInfo]:
    """Scan for installed Neural DSP plugins."""
    plugins = []
    if not NEURAL_DSP_PRESETS.exists():
        return plugins

    for entry in sorted(NEURAL_DSP_PRESETS.iterdir()):
        if entry.is_dir() and not entry.name.startswith('.'):
            # Check multiple possible preset locations within plugin folder
            preset_dirs = [entry / "Presets", entry / "User Presets", entry]
            presets = []
            for pd in preset_dirs:
                if pd.exists():
                    presets.extend(pd.rglob("*.ndspp"))

            if presets or (entry / "Presets").exists():
                plugins.append(PluginInfo(
                    name=entry.name,
                    path=str(entry),
                    preset_count=len(presets),
                    has_mapping=_has_mapping(entry.name)
                ))
    return plugins


def scan_presets(plugin_name: str) -> List[PresetInfo]:
    """Scan presets for a specific plugin."""
    preset_dir = NEURAL_DSP_PRESETS / plugin_name / "Presets"
    presets = []
    if not preset_dir.exists():
        # Try alternate preset locations
        for alt in ["User Presets", "."]:
            alt_dir = (NEURAL_DSP_PRESETS / plugin_name / alt).resolve()
            if alt_dir.exists():
                preset_dir = alt_dir
                break
        else:
            return presets

    for f in sorted(preset_dir.rglob("*.ndspp")):
        try:
            rel = f.relative_to(preset_dir)
        except ValueError:
            rel = f
        source = "factory" if "Factory" in str(rel) else "user"
        presets.append(PresetInfo(
            name=f.stem,
            path=str(f),
            source=source,
            uid=compute_preset_uid(str(f))
        ))
    return presets


def compute_preset_uid(filepath: str) -> str:
    """Compute JUCE-compatible hashCode64 for a preset file path."""
    hash_val = 0
    for char in filepath:
        hash_val = (hash_val * 31 + ord(char)) & 0xFFFFFFFFFFFFFFFF
    if hash_val >= 0x8000000000000000:
        hash_val -= 0x10000000000000000
    return str(hash_val)


def _has_mapping(plugin_name: str) -> bool:
    return any(MAPPING_DIR.glob(f"{plugin_name}*/*.xml")) if MAPPING_DIR.exists() else False
