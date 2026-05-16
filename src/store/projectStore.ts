import { create } from "zustand";
import type { Trigger } from "@/lib/types";

const DEMO_TRIGGERS: Trigger[] = [
  { id: "demo-1", time: 0, toneName: "Clean Chorus", program: 1, color: "#22c55e" },
  { id: "demo-2", time: 12.5, toneName: "Crunch Overdrive", program: 25, color: "#f59e0b" },
  { id: "demo-3", time: 28, toneName: "Lead Distortion", program: 30, color: "#ef4444" },
];

interface ProjectState {
  projectName: string;
  triggers: Trigger[];
  audioFilePath: string | null;
  audioDurationSec: number;
  isDemo: boolean;
  isFirstVisit: boolean;
  setProjectName: (name: string) => void;
  setTriggers: (triggers: Trigger[]) => void;
  addTrigger: (trigger: Trigger) => void;
  removeTrigger: (id: string) => void;
  updateTrigger: (id: string, updates: Partial<Trigger>) => void;
  setAudioFile: (path: string, durationSec: number) => void;
  clearAudio: () => void;
  loadDemoProject: () => void;
  resetProject: () => void;
}

const STORAGE_KEY = "tonemaster_project";

function loadFromStorage(): Partial<ProjectState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveToStorage(state: ProjectState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        projectName: state.projectName,
        triggers: state.triggers,
        audioFilePath: state.audioFilePath,
        audioDurationSec: state.audioDurationSec,
        isDemo: state.isDemo,
      })
    );
  } catch {
    // ignore
  }
}

const saved = loadFromStorage();
const isFirstVisit = !saved;

export const useProjectStore = create<ProjectState>((set) => ({
  projectName: saved?.projectName ?? "Untitled Project",
  triggers: isFirstVisit ? DEMO_TRIGGERS : (saved?.triggers ?? []),
  audioFilePath: saved?.audioFilePath ?? null,
  audioDurationSec: saved?.audioDurationSec ?? 60,
  isDemo: isFirstVisit ? true : (saved?.isDemo ?? false),
  isFirstVisit,

  setProjectName(name) {
    set({ projectName: name });
  },

  setTriggers(triggers) {
    set({ triggers, isDemo: false });
  },

  addTrigger(trigger) {
    set((state) => {
      const triggers = [...state.triggers, trigger].sort((a, b) => a.time - b.time);
      return { triggers, isDemo: false };
    });
  },

  removeTrigger(id) {
    set((state) => ({
      triggers: state.triggers.filter((t) => t.id !== id),
    }));
  },

  updateTrigger(id, updates) {
    set((state) => ({
      triggers: state.triggers.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    }));
  },

  setAudioFile(path, durationSec) {
    set({ audioFilePath: path, audioDurationSec: durationSec, isDemo: false });
  },

  clearAudio() {
    set({ audioFilePath: null, audioDurationSec: 60 });
  },

  loadDemoProject() {
    set({
      projectName: "Demo Project",
      triggers: DEMO_TRIGGERS,
      audioFilePath: null,
      audioDurationSec: 60,
      isDemo: true,
    });
  },

  resetProject() {
    set({
      projectName: "Untitled Project",
      triggers: [],
      audioFilePath: null,
      audioDurationSec: 60,
      isDemo: false,
    });
  },
}));

if (typeof window !== "undefined") {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  useProjectStore.subscribe((state) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => saveToStorage(state as ProjectState), 500);
  });
}
