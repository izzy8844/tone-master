"use client";

import { Download } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { useGatekeeper } from "@/hooks/useGatekeeper";
import { downloadMidiFile, type MidiTrigger, type MidiMetadata } from "@/lib/midi-export";
import { toast } from "@/components/Toast";

export default function ExportButton() {
  const triggers = useProjectStore((s) => s.triggers);
  const projectName = useProjectStore((s) => s.projectName);
  const audioDurationSec = useProjectStore((s) => s.audioDurationSec);
  const { guard } = useGatekeeper();

  const handleExport = () => {
    guard("export_xml", () => {
      try {
        if (triggers.length === 0) {
          toast.info("Add at least one trigger before exporting.");
          return;
        }

        const midiTriggers: MidiTrigger[] = triggers.map((t) => ({
          id: t.id,
          time: t.time,
          toneName: t.toneName,
          program: t.program,
          bank: t.bank,
        }));

        const metadata: MidiMetadata = {
          name: projectName,
          duration: audioDurationSec,
        };

        downloadMidiFile(midiTriggers, metadata);
        toast.success("MIDI file exported!");
      } catch {
        toast.error("Failed to export MIDI file.");
      }
    });
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:border-green-500 hover:text-green-400 text-xs transition-colors"
    >
      <Download className="w-3.5 h-3.5" />
      Export MIDI
    </button>
  );
}
