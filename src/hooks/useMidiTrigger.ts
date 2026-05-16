"use client";

import { useEffect, useRef } from "react";
import { usePlaybackStore } from "@/store/playbackStore";
import { useProjectStore } from "@/store/projectStore";
import { sendProgramChange, getCurrentPortId } from "@/lib/midi";

export function useMidiTrigger() {
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const currentTick = usePlaybackStore((s) => s.currentTick);
  const triggers = useProjectStore((s) => s.triggers);

  const lastFiredRef = useRef<string | null>(null);
  const prevTickRef = useRef<number>(0);

  // Main trigger detection
  useEffect(() => {
    if (!isPlaying) return;
    if (!getCurrentPortId()) return;
    if (triggers.length === 0) return;

    const currentTime = currentTick;
    const prevTick = prevTickRef.current;

    // Forward playback: check triggers in (prevTick, currentTime]
    if (currentTime > prevTick) {
      for (const trigger of triggers) {
        if (trigger.time > prevTick && trigger.time <= currentTime) {
          if (trigger.id !== lastFiredRef.current) {
            sendProgramChange(trigger.program, 0);
            lastFiredRef.current = trigger.id;
          }
        }
      }
    }

    // Exact position check (for seek-to-exact-time)
    for (const trigger of triggers) {
      if (Math.abs(trigger.time - currentTime) < 0.05) {
        if (trigger.id !== lastFiredRef.current) {
          sendProgramChange(trigger.program, 0);
          lastFiredRef.current = trigger.id;
        }
      }
    }

    prevTickRef.current = currentTime;
  }, [currentTick, isPlaying, triggers]);

  // Reset on stop
  useEffect(() => {
    if (!isPlaying) {
      lastFiredRef.current = null;
      prevTickRef.current = currentTick;
    }
  }, [isPlaying, currentTick]);
}
