"use client";

import { Trash2 } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { usePlaybackStore } from "@/store/playbackStore";
import { sendWS } from "@/lib/ws";

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}

export default function TriggerList() {
  const triggers = useProjectStore((s) => s.triggers);
  const removeTrigger = useProjectStore((s) => s.removeTrigger);
  const setCurrentTick = usePlaybackStore((s) => s.setCurrentTick);

  if (triggers.length === 0) {
    return (
      <div className="flex-1 rounded-lg border border-dashed border-zinc-700 flex items-center justify-center p-8">
        <p className="text-sm text-zinc-500">Double-click timeline to add Tone Preset</p>
      </div>
    );
  }

  return (
    <div className="flex-1 rounded-lg border border-zinc-700 overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[2rem_1fr_6rem_3rem] gap-2 px-3 py-2 text-xs font-medium text-zinc-500 border-b border-zinc-700 bg-zinc-900">
        <div>#</div>
        <div>Tone Preset</div>
        <div>Time</div>
        <div />
      </div>

      {/* Rows */}
      <div className="max-h-64 overflow-y-auto">
        {triggers.map((t, idx) => (
          <div
            key={t.id}
            className="grid grid-cols-[2rem_1fr_6rem_3rem] gap-2 px-3 py-2 text-sm border-b border-zinc-800 hover:bg-zinc-800/50 cursor-pointer transition-colors group"
            onClick={() => {
              setCurrentTick(t.time);
              sendWS({
                type: "playback_command",
                command: "seek",
                position_ms: t.time * 1000,
              });
            }}
          >
            <div className="text-zinc-500">{idx + 1}</div>
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: t.color ?? "#22c55e" }}
              />
              <span className="truncate text-zinc-200">{t.toneName}</span>
              <span className="text-xs text-zinc-600 shrink-0">PC {t.program}</span>
            </div>
            <div className="font-mono text-xs text-zinc-400 self-center">
              {formatTime(t.time)}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeTrigger(t.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all self-center justify-self-center"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
