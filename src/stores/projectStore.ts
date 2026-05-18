import { create } from 'zustand'
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

export interface ProjectData {
  id: number | string
  name: string
  triggers: ProjectTrigger[]
  audioFile?: string | null
}

interface ProjectState {
  projects: ProjectData[]; currentProject: ProjectData | null
  triggers: ProjectTrigger[]; audioFile: string | null
  waveformData: number[] | null; projectName: string; isDemo: boolean
  sidebarOpen: boolean; presets: typeof PRESET_TONES
  setSidebarOpen: (v: boolean) => void
  setProjects: (p: ProjectData[]) => void; setCurrentProject: (p: ProjectData | null) => void
  setProjectName: (n: string) => void; setAudioFile: (f: string | null) => void
  setWaveformData: (d: number[] | null) => void
  addTrigger: (time: number, pc: number, name?: string) => void
  removeTrigger: (id: number) => void
  updateTrigger: (id: number, u: Partial<ProjectTrigger>) => void; clearTriggers: () => void
  loadProject: (p: ProjectData) => void; loadDemoProject: () => void; newProject: () => void
}

function saved() { try { const r = localStorage.getItem('tonemaster_project'); return r ? JSON.parse(r) : {} } catch { return {} } }
function save(data: Record<string, unknown>) { try { localStorage.setItem('tonemaster_project', JSON.stringify(data)) } catch {} }

const DEMO_TRIGGERS: ProjectTrigger[] = [
  { id: 1, time: 0, pc: 0, name: 'Clean', color: TRIGGER_COLORS[0] },
  { id: 2, time: 12.5, pc: 2, name: 'Lead', color: TRIGGER_COLORS[2] },
  { id: 3, time: 28, pc: 3, name: 'Heavy', color: TRIGGER_COLORS[3] },
]

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [], currentProject: null,
  triggers: DEMO_TRIGGERS, audioFile: null, waveformData: null,
  projectName: 'Demo Project', isDemo: true, sidebarOpen: false,
  presets: PRESET_TONES,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  setProjects: (p) => set({ projects: p }),
  setCurrentProject: (p) => set({ currentProject: p }),
  setProjectName: (n) => set({ projectName: n }),
  setAudioFile: (f) => set({ audioFile: f }),
  setWaveformData: (d) => set({ waveformData: d }),
  addTrigger: (time, pc, name) => set((s) => ({
    triggers: [...s.triggers, { id: Date.now(), time, pc, name: name || `Tone ${pc}`, color: nextColor() }].sort((a, b) => a.time - b.time)
  })),
  removeTrigger: (id) => set((s) => ({ triggers: s.triggers.filter(t => t.id !== id) })),
  updateTrigger: (id, u) => set((s) => ({ triggers: s.triggers.map(t => t.id === id ? { ...t, ...u } : t) })),
  clearTriggers: () => set({ triggers: [] }),
  loadProject: (p) => set({ waveformData: null, currentProject: p, projectName: p.name, triggers: p.triggers || [], audioFile: p.audioFile || null, isDemo: false }),
  loadDemoProject: () => set({ currentProject: null, projectName: 'Demo Project', triggers: DEMO_TRIGGERS, audioFile: null, waveformData: null, isDemo: true }),
  newProject: () => { colorIdx = 0; set({ currentProject: null, projectName: 'Untitled Project', triggers: [], audioFile: null, waveformData: null, isDemo: false }) },
}))

export function hydrateProjectStore() {
  try {
    const s = saved() as any
    if (s.triggers?.length) { colorIdx = s.triggers.length }
    if (s.projectName || s.triggers?.length) {
      useProjectStore.setState({ triggers: s.triggers ?? [], audioFile: s.audioFile ?? null, projectName: s.projectName ?? 'Untitled Project', isDemo: false })
    }
  } catch {}
}

// ── Sync triggers to backend TimelineScheduler via WebSocket ──
let _prevTriggersLen = -1
let _isHydrating = true

export function setHydrating(v: boolean) { _isHydrating = v }

if (typeof window !== 'undefined') {
  useProjectStore.subscribe((state) => {
    const triggers = state.triggers
    if (triggers.length === _prevTriggersLen) return
    _prevTriggersLen = triggers.length
    if (_isHydrating) return
    wsSend({
      type: 'update_triggers',
      triggers: triggers.map(t => ({
        id: String(t.id),
        time_ms: Math.round(t.time * 1000),
        program: t.pc,
        name: t.name,
      })),
    })
  })

  // localStorage debounced save
  let st: ReturnType<typeof setTimeout> | null = null
  useProjectStore.subscribe((state) => {
    if (st) clearTimeout(st)
    st = setTimeout(() => save({ projectName: state.projectName, triggers: state.triggers, audioFile: state.audioFile }), 500)
  })
}
