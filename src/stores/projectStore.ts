import { create } from 'zustand'
import { usePlaybackStore } from './playbackStore'
import { wsSend } from '@/lib/ws'

export const PRESET_TONES = [
  { name: 'Clean', pc: 0 }, { name: 'Crunch', pc: 1 }, { name: 'Lead', pc: 2 },
  { name: 'Heavy', pc: 3 }, { name: 'Blues', pc: 4 }, { name: 'Jazz', pc: 5 },
  { name: 'Acoustic', pc: 6 }, { name: 'Chorus', pc: 7 }, { name: 'Delay', pc: 8 },
  { name: 'Reverb', pc: 9 }, { name: 'Wah', pc: 10 }, { name: 'Flanger', pc: 11 },
  { name: 'Phaser', pc: 12 }, { name: 'Tremolo', pc: 13 }, { name: 'Vibrato', pc: 14 },
  { name: 'Boost', pc: 15 },
]

export const TRIGGER_COLORS = [
  '#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#f97316',
  '#06b6d4', '#ec4899', '#84cc16', '#6366f1', '#14b8a6', '#f43f5e',
]

let colorIdx = 0
const nextColor = () => TRIGGER_COLORS[colorIdx++ % TRIGGER_COLORS.length]

export interface ProjectTrigger {
  id: number
  time: number
  pc: number
  name: string
  color: string
}

export interface RecentTone {
  name: string
  pc: number
}

export interface ProjectData {
  id: number | string
  name: string
  triggers: ProjectTrigger[]
  audioFile?: string | null
}

interface SavedProject {
  projectName?: string
  triggers?: ProjectTrigger[]
  audioFile?: string | null
  currentProjectId?: string | number | null
}

interface ProjectState {
  projects: ProjectData[]; currentProject: ProjectData | null
  triggers: ProjectTrigger[]; audioFile: string | null
  waveformData: number[] | null; projectName: string; isDemo: boolean
  sidebarOpen: boolean; presets: typeof PRESET_TONES
  recentTones: RecentTone[]
  setSidebarOpen: (v: boolean) => void
  setProjects: (p: ProjectData[]) => void; setCurrentProject: (p: ProjectData | null) => void
  setProjectName: (n: string) => void; setAudioFile: (f: string | null) => void
  setWaveformData: (d: number[] | null) => void
  addTrigger: (time: number, pc: number, name?: string) => void
  removeTrigger: (id: number) => void
  updateTrigger: (id: number, u: Partial<ProjectTrigger>) => void; clearTriggers: () => void
  addRecentTone: (name: string, pc: number) => void
  loadProject: (p: ProjectData) => void; loadDemoProject: () => void; newProject: () => void
}

function loadSaved(): SavedProject {
  if (typeof window === 'undefined') return {}
  try { const r = localStorage.getItem('tonemaster_project'); return r ? JSON.parse(r) : {} } catch { return {} }
}

function save(data: SavedProject) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem('tonemaster_project', JSON.stringify(data)) } catch {}
}

function loadRecentTones(): RecentTone[] {
  if (typeof window === 'undefined') return []
  try { const r = localStorage.getItem('tonemaster_recent_tones'); return r ? JSON.parse(r) : [] } catch { return [] }
}

function saveRecentTones(tones: RecentTone[]) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem('tonemaster_recent_tones', JSON.stringify(tones)) } catch {}
}

/** Validate a single trigger object from persisted data */
function isValidTrigger(t: unknown): t is ProjectTrigger {
  if (typeof t !== 'object' || t === null) return false
  const obj = t as Record<string, unknown>
  return (
    typeof obj.id === 'number' &&
    typeof obj.time === 'number' && Number.isFinite(obj.time) &&
    typeof obj.pc === 'number' &&
    typeof obj.name === 'string' &&
    typeof obj.color === 'string'
  )
}

const DEMO_TRIGGERS: ProjectTrigger[] = [
  { id: 1, time: 0, pc: 0, name: 'Clean', color: TRIGGER_COLORS[0] },
  { id: 2, time: 12.5, pc: 2, name: 'Lead', color: TRIGGER_COLORS[2] },
  { id: 3, time: 28, pc: 3, name: 'Heavy', color: TRIGGER_COLORS[3] },
]

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [], currentProject: null,
  triggers: DEMO_TRIGGERS, audioFile: null, waveformData: null,
  projectName: 'Demo Project', isDemo: true, sidebarOpen: false,
  presets: PRESET_TONES,
  recentTones: [],
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  setProjects: (p) => set({ projects: p }),
  setCurrentProject: (p) => set({ currentProject: p }),
  setProjectName: (n) => set({ projectName: n }),
  setAudioFile: (f) => set({ audioFile: f }),
  setWaveformData: (d) => set({ waveformData: d }),
  addTrigger: (time, pc, name) => {
    const toneName = name || `Tone ${pc}`
    set((s) => ({
      triggers: [...s.triggers, { id: Date.now(), time, pc, name: toneName, color: nextColor() }].sort((a, b) => a.time - b.time)
    }))
    // Record to recent tones
    get().addRecentTone(toneName, pc)
  },
  removeTrigger: (id) => {
    set((s) => ({ triggers: s.triggers.filter(t => t.id !== id) }))
    // Reset active highlight since indices shifted
    usePlaybackStore.getState().setActiveTriggerIndex(-1)
  },
  updateTrigger: (id, u) => set((s) => ({
    triggers: s.triggers.map(t => t.id === id ? { ...t, ...u } : t).sort((a, b) => a.time - b.time)
  })),
  clearTriggers: () => set({ triggers: [] }),
  addRecentTone: (name, pc) => {
    const current = get().recentTones
    // Remove duplicates by pc, add to front, max 20
    const filtered = current.filter(t => t.pc !== pc)
    const updated = [{ name, pc }, ...filtered].slice(0, 20)
    set({ recentTones: updated })
    saveRecentTones(updated)
  },
  loadProject: (p) => {
    colorIdx = p.triggers?.length ?? 0
    set({ currentProject: p, projectName: p.name, triggers: p.triggers || [], audioFile: p.audioFile || null, waveformData: null, isDemo: false })
    // Reset playback state for the new project
    const pb = usePlaybackStore.getState()
    pb.setCurrentTick(0)
    pb.setDuration(0)
    pb.setIsPlaying(false)
    pb.clearABLoop()
    pb.setActiveTriggerIndex(-1)
  },
  loadDemoProject: () => { colorIdx = DEMO_TRIGGERS.length; set({ currentProject: null, projectName: 'Demo Project', triggers: DEMO_TRIGGERS, audioFile: null, waveformData: null, isDemo: true }) },
  newProject: () => { colorIdx = 0; set({ currentProject: null, projectName: 'Untitled Project', triggers: [], audioFile: null, waveformData: null, isDemo: false }) },
}))

// Hydration guard — exported so useCloudSync can check it
export let isHydrating = false

export function hydrateProjectStore() {
  isHydrating = true
  const s = loadSaved()
  const recent = loadRecentTones()

  // Validate triggers from localStorage to prevent corrupted data from propagating
  const validTriggers = Array.isArray(s.triggers) ? s.triggers.filter(isValidTrigger) : []

  if (validTriggers.length) { colorIdx = validTriggers.length }

  if (s.projectName || validTriggers.length) {
    // Restore currentProject reference if an ID was persisted (prevents duplicate cloud projects)
    const currentProject: ProjectData | null = s.currentProjectId
      ? { id: s.currentProjectId, name: s.projectName ?? 'Untitled Project', triggers: validTriggers, audioFile: s.audioFile ?? null }
      : null

    useProjectStore.setState({
      currentProject,
      triggers: validTriggers,
      audioFile: s.audioFile ?? null,
      projectName: s.projectName ?? 'Untitled Project',
      isDemo: false,
      recentTones: recent,
    })
  } else {
    useProjectStore.setState({ recentTones: recent })
  }
  // Allow a microtask for subscriptions to settle, then unlock
  Promise.resolve().then(() => { isHydrating = false })
}

let st: ReturnType<typeof setTimeout> | null = null
if (typeof window !== 'undefined') {
  useProjectStore.subscribe((state) => {
    if (st) clearTimeout(st)
    st = setTimeout(() => save({
      projectName: state.projectName,
      triggers: state.triggers,
      audioFile: state.audioFile,
      currentProjectId: state.currentProject?.id ?? null,
    }), 500)
  })
}

// ── Sync triggers to backend TimelineScheduler via WebSocket ──
let _prevTriggers: ProjectTrigger[] = []
if (typeof window !== 'undefined') {
  useProjectStore.subscribe((state) => {
    // Only send when triggers array actually changed (reference check)
    if (state.triggers === _prevTriggers) return
    _prevTriggers = state.triggers
    // Skip during hydration to avoid stale data overwriting backend
    if (isHydrating) return
    syncTriggersToBackend(state.triggers)
  })
}

function syncTriggersToBackend(triggers: ProjectTrigger[]) {
  wsSend({
    type: 'update_triggers',
    triggers: triggers.map(t => ({
      id: t.id,
      time_ms: Math.round(t.time * 1000),
      program: t.pc,
      name: t.name,
    })),
  })
}
