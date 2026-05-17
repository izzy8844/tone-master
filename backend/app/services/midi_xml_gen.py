"""
Dual-format Neural DSP MIDI mapping XML generator.
Supports both old format (Fortin/Soldano) and new format (Mesa/Nolly).
"""
import xml.etree.ElementTree as ET
from xml.dom import minidom
from typing import Optional, List
from pathlib import Path
from ..models import PresetMapping, MappingFileInfo, MappingTone
from ..config import MAPPING_DIR

OLD_FORMAT = "old"  # Fortin Nameless, Soldano
NEW_FORMAT = "new"  # Mesa Boogie, Archetype Nolly


def _detect_plugin_format(plugin_name: str) -> str:
    """Auto-detect XML format by scanning existing mapping files."""
    search_dirs = [MAPPING_DIR / plugin_name]
    if search_dirs[0].exists():
        for f in search_dirs[0].rglob("*.xml"):
            if "ToneMaster" in f.name:
                continue
            content = f.read_text(errors="replace")
            if 'plugin_type=' in content or '<routings plugin_type' in content:
                return NEW_FORMAT
            if 'target=' in content and 'data1=' in content:
                return OLD_FORMAT
    return NEW_FORMAT  # Default to new


def generate_xml(plugin_name: str, mappings: List[PresetMapping], filename: Optional[str] = None) -> tuple:
    """Generate Neural DSP MIDI mapping XML. Returns (xml_string, filename)."""
    fmt = _detect_plugin_format(plugin_name)

    if fmt == OLD_FORMAT:
        return _generate_old_format(plugin_name, mappings, filename)
    else:
        return _generate_new_format(plugin_name, mappings, filename)


def _generate_old_format(plugin_name: str, mappings: List[PresetMapping], filename: Optional[str]) -> tuple:
    root = ET.Element("midi")
    routings = ET.SubElement(root, "routings")
    for m in mappings:
        routing = ET.SubElement(routings, "routing")
        routing.set("type", "pc_preset")
        routing.set("target", m.uid or "")
        routing.set("midiChannel", "0")
        routing.set("data1", str(m.pc))
        routing.set("data2", "0")
        routing.set("value", "0.0")
        routing.set("enabled", "1")

    xml_str = _pretty_xml(ET.tostring(root, encoding="unicode"))
    if not filename:
        filename = f"{plugin_name.replace(' ', '_')}_midi_mapping.xml"
    return xml_str, filename


def _generate_new_format(plugin_name: str, mappings: List[PresetMapping], filename: Optional[str]) -> tuple:
    root = ET.Element("midi")
    routings = ET.SubElement(root, "routings")
    routings.set("plugin_type", "Neural DSP")
    routings.set("plugin_name", plugin_name)
    routings.set("plugin_version", "1.0")

    for m in mappings:
        routing = ET.SubElement(routings, "routing")
        routing.set("type", "pc_preset")
        routing.set("channel", "0")
        routing.set("enabled", "1")
        routing.set("program", str(m.pc))
        routing.set("preset", m.uid or "")

    xml_str = _pretty_xml(ET.tostring(root, encoding="unicode"))
    if not filename:
        filename = f"{plugin_name.replace(' ', '_')}_midi_mapping.xml"
    return xml_str, filename


def _pretty_xml(xml_str: str) -> str:
    try:
        reparsed = minidom.parseString(xml_str)
        out = reparsed.toprettyxml(indent="  ")
        lines = out.split('\n')
        if lines[0].startswith('<?xml'):
            out = '\n'.join(lines[1:])
        return out
    except Exception:
        return xml_str


def save_mapping(plugin_name: str, xml_content: str, filename: str) -> str:
    plugin_dir = MAPPING_DIR / plugin_name
    plugin_dir.mkdir(parents=True, exist_ok=True)
    filepath = plugin_dir / filename
    filepath.write_text(xml_content, encoding="utf-8")
    return str(filepath)


def list_mappings(plugin_name: Optional[str] = None) -> List[MappingFileInfo]:
    results = []
    search_dir = MAPPING_DIR / plugin_name if plugin_name else MAPPING_DIR
    if not search_dir.exists():
        return results
    for xml_file in search_dir.rglob("*.xml"):
        try:
            tree = ET.parse(xml_file)
            root = tree.getroot()
            routings = root.find("routings")
            tone_count = len(routings.findall("routing")) if routings else 0
            results.append(MappingFileInfo(
                filename=xml_file.name,
                plugin_name=root.get("plugin_name", xml_file.parent.name),
                tone_count=tone_count,
                path=str(xml_file)
            ))
        except Exception:
            continue
    return results


def get_mapping_tones(plugin_name: str, filename: str) -> List[MappingTone]:
    filepath = MAPPING_DIR / plugin_name / filename
    if not filepath.exists():
        return []
    tree = ET.parse(filepath)
    routings = tree.getroot().find("routings")
    if not routings:
        return []
    tones = []
    for r in routings.findall("routing"):
        pc = int(r.get("program", r.get("data1", 0)))
        name = r.get("name", "")
        uid = r.get("preset", r.get("target"))
        tones.append(MappingTone(pc=pc, name=name, uid=uid))
    return tones


def delete_mapping(plugin_name: str, filename: str) -> bool:
    filepath = MAPPING_DIR / plugin_name / filename
    if filepath.exists():
        filepath.unlink()
        return True
    return False


def auto_map(preset_names: List[str], start_pc: int = 0) -> List[PresetMapping]:
    return [PresetMapping(pc=start_pc + i, name=name) for i, name in enumerate(preset_names) if start_pc + i <= 127]


def auto_map_and_install(plugin_name: str, preset_names: List[str]) -> dict:
    """One-click: auto map PC numbers, generate XML, install to mappings dir."""
    mappings = auto_map(preset_names)
    xml_content, filename = generate_xml(plugin_name, mappings)
    install_path = save_mapping(plugin_name, xml_content, filename)
    return {"success": True, "path": install_path, "xml": xml_content, "filename": filename}


def list_installed_mappings(plugin_name: str) -> List[dict]:
    """List installed mapping files for a plugin with parsed tone data."""
    return [m.model_dump() for m in list_mappings(plugin_name)]
