"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useProjectStore } from "@/store/projectStore";
import { usePlaybackStore } from "@/store/playbackStore";
import type { Trigger } from "@/lib/types";
import type { TriggerRow, PlaybackSettingsRow } from "@/lib/supabase/database.types";

type SyncStatus = "idle" | "syncing" | "error";

// ----- Serialization -----

function triggersToDb(triggers: Trigger[]): TriggerRow[] {
  return triggers.map((t) => ({
    id: t.id,
    time: t.time,
    tone_name: t.toneName,
    program: t.program,
    bank: t.bank,
    color: t.color,
  }));
}

function triggersFromDb(rows: TriggerRow[]): Trigger[] {
  return rows.map((r) => ({
    id: r.id,
    time: r.time,
    toneName: r.tone_name,
    program: r.program,
    bank: r.bank,
    color: r.color,
  }));
}

function playbackToDb(): PlaybackSettingsRow {
  const s = usePlaybackStore.getState();
  return {
    zoom: s.zoom,
    current_tick: s.currentTick,
    loop_a: s.loopA,
    loop_b: s.loopB,
    midi_port: s.currentMidiPort,
  };
}

function playbackFromDb(row: PlaybackSettingsRow) {
  const s = usePlaybackStore.getState();
  s.setZoom(row.zoom ?? 1);
  s.setCurrentTick(row.current_tick ?? 0);
  s.setLoop(row.loop_a ?? null, row.loop_b ?? null);
  s.setMidiPort(row.midi_port ?? null);
}

// ----- Hook -----

export function useCloudSync() {
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const isLoaded = useAuthStore((s) => s.isLoaded);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");

  const cloudProjectIdRef = useRef<string | undefined>(undefined);
  const syncStatusRef = useRef<SyncStatus>("idle");
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveToCloud = useCallback(async () => {
    if (!isSignedIn) return;
    syncStatusRef.current = "syncing";
    setSyncStatus("syncing");

    try {
      const project = useProjectStore.getState();
      const payload: Record<string, unknown> = {
        name: project.projectName,
        triggers: triggersToDb(project.triggers),
        audio_path: project.audioFilePath,
        audio_duration_sec: project.audioDurationSec,
        playback_settings: playbackToDb(),
        is_demo: project.isDemo,
      };
      if (cloudProjectIdRef.current) {
        payload.id = cloudProjectIdRef.current;
      }

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        cloudProjectIdRef.current = data.project?.id;
        syncStatusRef.current = "idle";
        setSyncStatus("idle");
      }
    } catch {
      syncStatusRef.current = "error";
      setSyncStatus("error");
    }
  }, [isSignedIn]);

  const loadFromCloud = useCallback(async () => {
    if (!isSignedIn) return;
    syncStatusRef.current = "syncing";
    setSyncStatus("syncing");

    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      const projects: Record<string, unknown>[] = data.projects ?? [];

      if (projects.length === 0) {
        syncStatusRef.current = "idle";
        setSyncStatus("idle");
        return;
      }

      // Take the first (most recent) project
      const p = projects[0];
      cloudProjectIdRef.current = p.id as string;

      const ps = useProjectStore.getState();
      ps.setProjectName((p.name as string) ?? "Untitled Project");
      if (p.audio_path) {
        ps.setAudioFile(p.audio_path as string, (p.audio_duration_sec as number) ?? 60);
      }
      if (p.triggers) {
        ps.setTriggers(triggersFromDb(p.triggers as TriggerRow[]));
      }
      if (p.playback_settings) {
        playbackFromDb(p.playback_settings as PlaybackSettingsRow);
      }

      syncStatusRef.current = "idle";
      setSyncStatus("idle");
    } catch {
      syncStatusRef.current = "error";
      setSyncStatus("error");
    }
  }, [isSignedIn]);

  // Auto-sync on sign-in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      loadFromCloud();
    }
  }, [isLoaded, isSignedIn, loadFromCloud]);

  // Debounced auto-push (2 second debounce)
  useEffect(() => {
    if (!isSignedIn) return;

    const unsubProject = useProjectStore.subscribe(() => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(saveToCloud, 2000);
    });

    const unsubPlayback = usePlaybackStore.subscribe(() => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(saveToCloud, 2000);
    });

    return () => {
      unsubProject();
      unsubPlayback();
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [isSignedIn, saveToCloud]);

  return { saveToCloud, loadFromCloud, syncStatus };
}
