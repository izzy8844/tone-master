"""
Scan Neural DSP plugin preset directories for .xml binary preset files.
Extracts preset names, UIDs (via juce_hash_code_64 on absolute path), and source categories.
"""
from pathlib import Path
from typing import List
from ..config import NEURAL_DSP_PRESETS, MAPPING_DIR
from ..models import PresetInfo, PluginInfo
from .preset_uid import extract_preset_uid, juce_hash_code_64, compute_preset_id_from_file


def scan_plugins() -> List[PluginInfo]:
    plugins = []
    if not NEURAL_DSP_PRESETS.exists(): return plugins
    for entry in sorted(NEURAL_DSP_PRESETS.iterdir()):
        if entry.is_dir() and not entry.name.startswith('.'):
            presets = _scan_plugin_presets_raw(entry.name)
            if presets:
                plugins.append(PluginInfo(name=entry.name, path=str(entry), preset_count=len(presets), has_mapping=_has_mapping(entry.name)))
    return plugins


def scan_presets(plugin_name: str, source: str | None = None) -> List[PresetInfo]:
    raw = _scan_plugin_presets_raw(plugin_name)
    results = []
    seen_names = set()
    for f in sorted(set(raw), key=lambda x: x.stem):
        filepath = str(f)
        uid_from_path = juce_hash_code_64(filepath)
        info = extract_preset_uid(filepath)
        name = info.get("name", f.stem)
        if name in seen_names: continue
        seen_names.add(name)
        preset_source = _get_source(plugin_name, f)
        if source and source.lower() not in preset_source.lower(): continue
        results.append(PresetInfo(name=name, path=filepath, source=preset_source, uid=str(uid_from_path)))
    return results


def _scan_plugin_presets_raw(plugin_name: str) -> List[Path]:
    plugin_dir = NEURAL_DSP_PRESETS / plugin_name
    if not plugin_dir.exists(): return []
    presets = []
    for subdir_name in ("User", "Artists", "Neural DSP", "Factory"):
        subdir = plugin_dir / subdir_name
        if subdir.exists(): presets.extend(subdir.rglob("*.xml"))
    pd = plugin_dir / "Presets"
    if pd.exists(): presets.extend(pd.rglob("*.xml"))
    return presets


def _get_source(plugin_name: str, filepath: Path) -> str:
    plugin_dir = NEURAL_DSP_PRESETS / plugin_name
    try:
        rel = filepath.parent.relative_to(plugin_dir)
        return str(rel) if rel != Path() else "User"
    except ValueError: return "User"


def _has_mapping(plugin_name: str) -> bool:
    return any(MAPPING_DIR.glob(f"{plugin_name}*/*.xml")) if MAPPING_DIR.exists() else False
