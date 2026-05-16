import { create } from "zustand";

interface PlaybackState {
  isPlaying: boolean;
  currentTick: number;
  duration: number;
  zoom: number;
  loopA: number | null;
  loopB: number | null;
  currentMidiPort: string | null;
  setPlaying: (playing: boolean) => void;
  setCurrentTick: (tick: number) => void;
  setDuration: (dur: number) => void;
  setZoom: (zoom: number) => void;
  setLoop: (a: number | null, b: number | null) => void;
  setMidiPort: (port: string | null) => void;
}

const STORAGE_KEY = "tonemaster_playback";

function loadFromStorage(): Partial<PlaybackState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveToStorage(state: PlaybackState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        zoom: state.zoom,
        currentTick: state.currentTick,
        loopA: state.loopA,
        loopB: state.loopB,
        currentMidiPort: state.currentMidiPort,
      })
    );
  } catch {
    // ignore
  }
}

const saved = loadFromStorage();

export const usePlaybackStore = create<PlaybackState>((set) => ({
  isPlaying: false,
  currentTick: saved?.currentTick ?? 0,
  duration: 60,
  zoom: saved?.zoom ?? 1,
  loopA: saved?.loopA ?? null,
  loopB: saved?.loopB ?? null,
  currentMidiPort: saved?.currentMidiPort ?? null,

  setPlaying(playing) {
    set({ isPlaying: playing });
  },

  setCurrentTick(tick) {
    set({ currentTick: tick });
  },

  setDuration(dur) {
    set({ duration: dur });
  },

  setZoom(zoom) {
    set({ zoom: Math.min(10, Math.max(1, zoom)) });
  },

  setLoop(a, b) {
    set({ loopA: a, loopB: b });
  },

  setMidiPort(port) {
    set({ currentMidiPort: port });
  },
}));

if (typeof window !== "undefined") {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  usePlaybackStore.subscribe((state) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => saveToStorage(state as PlaybackState), 500);
  });
}
