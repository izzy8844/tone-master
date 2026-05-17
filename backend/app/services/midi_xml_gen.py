"""
Generate Neural DSP compatible MIDI mapping XML files.
Format: <midi plugin_type="Neural DSP" plugin_name="X"><routings><routing pc="0" name="Y" uid="Z"/></routings></midi>
"""
import xml.etree.ElementTree as ET
from xml.dom import minidom
from typing import List, Optional
from pathlib import Path
from ..models import PresetMapping, MappingFileInfo, MappingTone
from ..config import MAPPING_DIR


def generate_xml(plugin_name: str, mappings: List[PresetMapping], filename: Optional[str] = None) -> tuple:
    """Generate a Neural DSP MIDI mapping XML. Returns (xml_string, filename)."""
    root = ET.Element("midi")
    root.set("plugin_type", "Neural DSP")
    root.set("plugin_name", plugin_name)

    routings = ET.SubElement(root, "routings")
    for m in mappings:
        routing = ET.SubElement(routings, "routing")
        routing.set("pc", str(m.pc))
        routing.set("name", m.name)
        if m.uid:
            routing.set("uid", m.uid)

    xml_str = minidom.parseString(ET.tostring(root, encoding="unicode")).toprettyxml(indent="  ")
    lines = xml_str.split('\n')
    if lines[0].startswith('<?xml'):
        xml_str = '\n'.join(lines[1:])

    if not filename:
        filename = f"{plugin_name.replace(' ', '_')}_midi_mapping.xml"
    return xml_str, filename


def save_mapping(plugin_name: str, xml_content: str, filename: str) -> str:
    """Save mapping XML to the mappings directory."""
    plugin_dir = MAPPING_DIR / plugin_name
    plugin_dir.mkdir(parents=True, exist_ok=True)
    filepath = plugin_dir / filename
    filepath.write_text(xml_content, encoding="utf-8")
    return str(filepath)


def list_mappings(plugin_name: Optional[str] = None) -> List[MappingFileInfo]:
    """List all installed mapping files."""
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
    """Parse a mapping XML and return all tone entries."""
    filepath = MAPPING_DIR / plugin_name / filename
    if not filepath.exists():
        return []
    tree = ET.parse(filepath)
    routings = tree.getroot().find("routings")
    if not routings:
        return []
    return [
        MappingTone(pc=int(r.get("pc", 0)), name=r.get("name", ""), uid=r.get("uid"))
        for r in routings.findall("routing")
    ]


def delete_mapping(plugin_name: str, filename: str) -> bool:
    filepath = MAPPING_DIR / plugin_name / filename
    if filepath.exists():
        filepath.unlink()
        return True
    return False


def auto_map(preset_names: List[str], start_pc: int = 0) -> List[PresetMapping]:
    """Auto-assign PC numbers to presets sequentially."""
    return [PresetMapping(pc=start_pc + i, name=name) for i, name in enumerate(preset_names) if start_pc + i <= 127]
