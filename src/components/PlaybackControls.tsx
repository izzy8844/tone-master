"use client";

import { useRef, useCallback, type ChangeEvent } from "react";
import { Play, Pause, Square, SkipBack, Upload } from "lucide-react";
import { usePlaybackStore } from "@/store/playbackStore";
import { useProjectStore } from "@/store/projectStore";
import { useGatekeeper } from "@/hooks/useGatekeeper";
import { sendWS } from "@/lib/ws";

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getBackendUrl(): string {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8765/ws";
  return wsUrl.replace("ws://", "http://").replace("/ws", "");
}

export default function PlaybackControls() {
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const setPlaying = usePlaybackStore((s) => s.setPlaying);
  const currentTick = usePlaybackStore((s) => s.currentTick);
  const setCurrentTick = usePlaybackStore((s) => s.setCurrentTick);
  const setAudioFile = useProjectStore((s) => s.setAudioFile);
  const audioFilePath = useProjectStore((s) => s.audioFilePath);
  const { guard } = useGatekeeper();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = () => {
    guard("import_audio", () => fileInputRef.current?.click());
  };

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);

      try {
        const backendUrl = getBackendUrl();
        const res = await fetch(`${backendUrl}/api/audio/upload`, {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          setAudioFile(data.path, data.duration_sec ?? 60);
          sendWS({ type: "load_audio", path: data.path });
        }
      } catch {
        // Backend unavailable — use local fallback
        try {
          const arrayBuffer = await file.arrayBuffer();
          const audioContext = new AudioContext();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const url = URL.createObjectURL(file);
          setAudioFile(url, audioBuffer.duration);
          await audioContext.close();
        } catch {
          // even local fallback failed
        }
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [setAudioFile]
  );

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.wav,.flac,.ogg,.m4a"
        className="hidden"
        onChange={handleFileChange}
      />

      <button
        onClick={handleUpload}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:border-green-500 hover:text-green-400 text-xs transition-colors"
        title={audioFilePath ? "Replace audio" : "Upload audio"}
      >
        <Upload className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={() => {
          setCurrentTick(0);
          sendWS({ type: "playback_command", command: "seek", position_ms: 0 });
        }}
        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
      >
        <SkipBack className="w-4 h-4" />
      </button>

      <button
        onClick={() => {
          if (isPlaying) {
            setPlaying(false);
            sendWS({ type: "playback_command", command: "pause" });
          } else {
            setPlaying(true);
            sendWS({ type: "playback_command", command: "play" });
          }
        }}
        className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>

      <button
        onClick={() => {
          setPlaying(false);
          setCurrentTick(0);
          sendWS({ type: "playback_command", command: "stop" });
        }}
        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
      >
        <Square className="w-4 h-4" />
      </button>

      <span className="text-sm text-zinc-400 font-mono tabular-nums min-w-[4rem]">
        {formatTime(currentTick)}
      </span>
    </div>
  );
}
