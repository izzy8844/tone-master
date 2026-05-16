"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { useGatekeeper } from "@/hooks/useGatekeeper";
import type { Trigger } from "@/lib/types";

const TONE_PRESETS = [
  { name: "Clean Chorus", program: 1, color: "#22c55e" },
  { name: "Crunch Overdrive", program: 25, color: "#f59e0b" },
  { name: "Lead Distortion", program: 30, color: "#ef4444" },
  { name: "Jazz Clean", program: 3, color: "#3b82f6" },
  { name: "Metal High Gain", program: 29, color: "#a855f7" },
  { name: "Acoustic Sim", program: 5, color: "#06b6d4" },
  { name: "Blues Overdrive", program: 26, color: "#ec4899" },
  { name: "Ambient Reverb", program: 8, color: "#8b5cf6" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  time: number;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ToneAddDialog({ open, onClose, time }: Props) {
  const addTrigger = useProjectStore((s) => s.addTrigger);
  const { guard } = useGatekeeper();
  const [customName, setCustomName] = useState("");
  const [customPC, setCustomPC] = useState("");

  if (!open) return null;

  const handleAdd = (preset: (typeof TONE_PRESETS)[number]) => {
    guard("add_trigger", () => {
      const trigger: Trigger = {
        id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        time,
        toneName: preset.name,
        program: preset.program,
        color: preset.color,
      };
      addTrigger(trigger);
    });
  };

  const handleCustomAdd = () => {
    if (!customName.trim() || !customPC.trim()) return;
    const pc = parseInt(customPC, 10);
    if (isNaN(pc) || pc < 0 || pc > 127) return;
    guard("add_trigger", () => {
      const trigger: Trigger = {
        id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        time,
        toneName: customName.trim(),
        program: pc,
        color: "#1db954",
      };
      addTrigger(trigger);
    });
    setCustomName("");
    setCustomPC("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#18181b] rounded-2xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Add Tone Preset</h2>
            <p className="text-xs text-zinc-500">at {formatTime(time)}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset grid */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          {TONE_PRESETS.map((p) => (
            <button
              key={p.program}
              onClick={() => handleAdd(p)}
              className="flex items-center gap-3 p-3 rounded-lg border border-zinc-700 hover:border-green-500/50 hover:bg-zinc-800 transition-colors text-left"
            >
              <span
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: p.color }}
              />
              <div className="min-w-0">
                <div className="text-sm text-zinc-200 truncate">{p.name}</div>
                <div className="text-xs text-zinc-500">PC {p.program}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Custom input */}
        <div className="border-t border-zinc-700 pt-4">
          <p className="text-xs text-zinc-500 mb-3">Custom Tone</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Tone name"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-green-500 focus:outline-none"
            />
            <input
              type="number"
              placeholder="PC#"
              min={0}
              max={127}
              value={customPC}
              onChange={(e) => setCustomPC(e.target.value)}
              className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-green-500 focus:outline-none"
            />
            <button
              onClick={handleCustomAdd}
              className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
