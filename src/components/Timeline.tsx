"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { usePlaybackStore } from "@/store/playbackStore";
import { useProjectStore } from "@/store/projectStore";
import { useGatekeeper } from "@/hooks/useGatekeeper";
import { sendWS } from "@/lib/ws";
import type { Trigger } from "@/lib/types";

// ----- Constants -----
const CANVAS_HEIGHT = 200;
const HEADER_HEIGHT = 30;
const SEGMENT_BAR_HEIGHT = 28;
const WAVEFORM_TOP = HEADER_HEIGHT;
const WAVEFORM_HEIGHT = CANVAS_HEIGHT - HEADER_HEIGHT - SEGMENT_BAR_HEIGHT;
const PIXELS_PER_SECOND = 80;

interface Props {
  onAddTrigger?: (time: number) => void;
}

export default function Timeline({ onAddTrigger }: Props) {
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const currentTick = usePlaybackStore((s) => s.currentTick);
  const setCurrentTick = usePlaybackStore((s) => s.setCurrentTick);
  const duration = usePlaybackStore((s) => s.duration);
  const zoom = usePlaybackStore((s) => s.zoom);
  const setZoom = usePlaybackStore((s) => s.setZoom);
  const loopA = usePlaybackStore((s) => s.loopA);
  const loopB = usePlaybackStore((s) => s.loopB);
  const triggers = useProjectStore((s) => s.triggers);
  const audioFilePath = useProjectStore((s) => s.audioFilePath);
  const audioDurationSec = useProjectStore((s) => s.audioDurationSec);
  const { guard } = useGatekeeper();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);

  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [visibleWidth, setVisibleWidth] = useState(800);

  const totalWidth = Math.max(visibleWidth, audioDurationSec * PIXELS_PER_SECOND * zoom);

  // ----- ResizeObserver -----
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setVisibleWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ----- Coordinate helpers -----
  const getTimeFromX = useCallback(
    (clientX: number): number => {
      const canvas = canvasRef.current;
      if (!canvas) return 0;
      const rect = canvas.getBoundingClientRect();
      const scrollLeft = scrollRef.current?.scrollLeft ?? 0;
      const x = clientX - rect.left + scrollLeft;
      const t = x / (PIXELS_PER_SECOND * zoom);
      return Math.min(audioDurationSec, Math.max(0, t));
    },
    [zoom, audioDurationSec]
  );

  const isNearPlayhead = useCallback(
    (clientX: number): boolean => {
      const canvas = canvasRef.current;
      if (!canvas) return false;
      const rect = canvas.getBoundingClientRect();
      const scrollLeft = scrollRef.current?.scrollLeft ?? 0;
      const playheadX = currentTick * PIXELS_PER_SECOND * zoom;
      const mouseX = clientX - rect.left + scrollLeft;
      return Math.abs(mouseX - playheadX) < 8;
    },
    [currentTick, zoom]
  );

  const findTriggerAtX = useCallback(
    (clientX: number): Trigger | null => {
      const time = getTimeFromX(clientX);
      const threshold = 0.5 / zoom;
      for (const t of triggers) {
        if (Math.abs(t.time - time) < threshold) return t;
      }
      return null;
    },
    [getTimeFromX, zoom, triggers]
  );

  // ----- Waveform loading -----
  useEffect(() => {
    if (!audioFilePath) {
      setWaveformPeaks([]);
      return;
    }
    const loadWaveform = async () => {
      try {
        const res = await fetch(
          `/api/audio/waveform?path=${encodeURIComponent(audioFilePath)}&num_peaks=${Math.round(totalWidth / 2)}`
        );
        if (res.ok) {
          const data = await res.json();
          setWaveformPeaks(data.peaks ?? []);
        }
      } catch {
        // backend unavailable
      }
    };
    loadWaveform();
  }, [audioFilePath, totalWidth]);

  // ----- Canvas draw -----
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = totalWidth * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    canvas.style.width = `${totalWidth}px`;
    canvas.style.height = `${CANVAS_HEIGHT}px`;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "#0f0f0f";
    ctx.fillRect(0, 0, totalWidth, CANVAS_HEIGHT);

    // Time ruler
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, totalWidth, HEADER_HEIGHT);

    const tickInterval = zoom >= 2 ? 1 : zoom >= 1 ? 5 : 10;

    for (let t = 0; t <= audioDurationSec; t += tickInterval) {
      const x = t * PIXELS_PER_SECOND * zoom;
      ctx.strokeStyle = "#333";
      ctx.beginPath();
      ctx.moveTo(x, HEADER_HEIGHT - 5);
      ctx.lineTo(x, HEADER_HEIGHT);
      ctx.stroke();

      ctx.fillStyle = "#666";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      const m = Math.floor(t / 60);
      const s = Math.floor(t % 60);
      ctx.fillText(`${m}:${s.toString().padStart(2, "0")}`, x, 12);
    }

    // Loop region
    if (loopA !== null && loopB !== null) {
      const lx = loopA * PIXELS_PER_SECOND * zoom;
      const lw = (loopB - loopA) * PIXELS_PER_SECOND * zoom;
      ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
      ctx.fillRect(lx, WAVEFORM_TOP, lw, WAVEFORM_HEIGHT);
      ctx.strokeStyle = "rgba(59, 130, 246, 0.5)";
      ctx.lineWidth = 1;
      ctx.strokeRect(lx, WAVEFORM_TOP, lw, WAVEFORM_HEIGHT);
      ctx.lineWidth = 1;
    }

    // Waveform
    const midY = WAVEFORM_TOP + WAVEFORM_HEIGHT / 2;
    if (waveformPeaks.length > 0) {
      const barWidth = totalWidth / waveformPeaks.length;
      ctx.fillStyle = "#1db954";
      for (let i = 0; i < waveformPeaks.length; i++) {
        const h = waveformPeaks[i] * (WAVEFORM_HEIGHT / 2);
        ctx.fillRect(i * barWidth, midY - h, Math.max(1, barWidth - 0.5), h * 2);
      }
    } else {
      ctx.fillStyle = "#555";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        audioFilePath ? "Loading waveform..." : "No audio loaded",
        totalWidth / 2,
        midY
      );
    }

    // Tone Segments Bar
    const segY = WAVEFORM_TOP + WAVEFORM_HEIGHT;
    ctx.fillStyle = "#141414";
    ctx.fillRect(0, segY, totalWidth, SEGMENT_BAR_HEIGHT);

    if (triggers.length > 0) {
      const sorted = [...triggers].sort((a, b) => a.time - b.time);
      for (let i = 0; i < sorted.length; i++) {
        const t = sorted[i];
        const x = t.time * PIXELS_PER_SECOND * zoom;
        const nextX = i < sorted.length - 1
          ? sorted[i + 1].time * PIXELS_PER_SECOND * zoom
          : totalWidth;
        const segW = nextX - x;
        if (segW > 0) {
          ctx.fillStyle = t.color ? `${t.color}20` : "rgba(255,255,255,0.1)";
          ctx.fillRect(x, segY, segW, SEGMENT_BAR_HEIGHT);
        }
        // Trigger line
        ctx.strokeStyle = t.color ?? "#22c55e";
        ctx.beginPath();
        ctx.setLineDash([4, 3]);
        ctx.moveTo(x, WAVEFORM_TOP);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    } else {
      ctx.fillStyle = "#555";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Tone Preset", 8, segY + SEGMENT_BAR_HEIGHT / 2 + 4);
    }

    // Playhead
    const playX = currentTick * PIXELS_PER_SECOND * zoom;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(playX, 0);
    ctx.lineTo(playX, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.lineWidth = 1;

    // Playhead triangle
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(playX, 0);
    ctx.lineTo(playX - 5, HEADER_HEIGHT - 5);
    ctx.lineTo(playX + 5, HEADER_HEIGHT - 5);
    ctx.closePath();
    ctx.fill();
  }, [
    totalWidth, zoom, audioDurationSec, currentTick, triggers,
    waveformPeaks, audioFilePath, loopA, loopB,
  ]);

  // Animation loop
  useEffect(() => {
    let rafId: number;
    const loop = () => {
      draw();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [draw]);

  // Auto-scroll
  useEffect(() => {
    if (!isPlaying || !scrollRef.current) return;
    const playX = currentTick * PIXELS_PER_SECOND * zoom;
    const visibleLeft = scrollRef.current.scrollLeft;
    const visibleRight = visibleLeft + visibleWidth;
    const threshold = visibleLeft + visibleWidth * 0.7;

    if (playX > threshold && scrollRef.current) {
      scrollRef.current.scrollLeft = playX - visibleWidth * 0.3;
    } else if (playX < visibleLeft && scrollRef.current) {
      scrollRef.current.scrollLeft = playX;
    }
  }, [isPlaying, currentTick, zoom, visibleWidth]);

  // Mouse events
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isNearPlayhead(e.clientX)) {
        setIsDraggingPlayhead(true);
      }
    },
    [isNearPlayhead]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isDraggingPlayhead) {
        setCurrentTick(getTimeFromX(e.clientX));
      }
    },
    [isDraggingPlayhead, setCurrentTick, getTimeFromX]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isDraggingPlayhead) {
        setIsDraggingPlayhead(false);
        const time = getTimeFromX(e.clientX);
        sendWS({ type: "playback_command", command: "seek", position_ms: time * 1000 });
      }
    },
    [isDraggingPlayhead, getTimeFromX]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const existing = findTriggerAtX(e.clientX);
      if (!existing) {
        const time = getTimeFromX(e.clientX);
        guard("add_trigger", () => onAddTrigger?.(time));
      }
    },
    [findTriggerAtX, getTimeFromX, guard, onAddTrigger]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY > 0) {
          setZoom(zoom - 0.2);
        } else {
          setZoom(zoom + 0.2);
        }
      }
    },
    [zoom, setZoom]
  );

  return (
    <div className="flex flex-col gap-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-300">Backing Track Player</h2>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={1}
            max={10}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-24 accent-green-500 h-1"
          />
          <span className="text-xs text-zinc-500 min-w-[3rem]">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>

      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="overflow-x-auto rounded-lg border border-white/10"
        onWheel={handleWheel}
      >
        <canvas
          ref={canvasRef}
          className="block cursor-pointer"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => setIsDraggingPlayhead(false)}
          onDoubleClick={handleDoubleClick}
        />
      </div>
    </div>
  );
}
