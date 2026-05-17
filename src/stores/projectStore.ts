import { create } from 'zustand'

export const PRESET_TONES = [
  { name: 'Clean', pc: 0, color: '#22c55e' },
  { name: 'Crunch', pc: 1, color: '#f59e0b' },
  { name: 'Lead', pc: 2, color: '#ef4444' },
  { name: 'Rhythm', pc: 3, color: '#3b82f6' },
  { name: 'Solo', pc: 4, color: '#a855f7' },
  { name: 'Ambient', pc: 5, color: '#06b6d4' },
  { name: 'Clean Chorus', pc: 6, color: '#ec4899' },
  { name: 'Crunch Drive', pc: 7, color: '#8b5cf6' },
  { name: 'Heavy', pc: 8, color: '#f97316' },
  { name: 'Metal', pc: 9, color: '#dc2626' },
  { name: 'Jazz', pc: 10, color: '#14b8a6' },
  { name: 'Blues', pc: 11, color: '#eab308' },
  { name: 'Funk', pc: 12, color: '#84cc16' },
  { name: 'Acoustic', pc: 13, color: '#10b981' },
  { name: 'Pop', pc: 14, color: '#6366f1' },
  { name: 'Rock', pc: 15, color: '#d946ef' },
]

export const TRIGGER_COLORS = [
  '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7',
  '#06b6d4', '#ec4899', '#8b5cf6', '#f97316', '#dc2626',
  '#14b8a6', '#eab308',
]

export const DEMO_TRIGGERS: ProjectTrigger[] = [
  { id: 'demo-1', time: 5.0, program: 0, toneName: 'Clean', color: TRIGGER_COLORS[0] },
  { id: 'demo-2', time: 15.0, program: 2, toneName: 'Lead', color: TRIGGER_COLORS[2] },
  { id: 'demo-3', time: 25.0, program: 4, toneName: 'Solo', color: TRIGGER_COLORS[4] },
]

export interface ProjectTrigger {
  id: string
  time: number
  program: number
  toneName: string
  color: string
  bank?: number
}

export interface ProjectData {
  id: string
  name: string
  audio?: { filename?: string; path?: string; duration_ms?: number }
  device?: { plugin?: string }
  triggers: ProjectTrigger[]
  created_at?: string
  updated_at?: string
}

interface RecentTone {
  name: string
  pc: number
  count: number
}

interface ProjectState {
  projects: ProjectData[]
  currentProject: ProjectData | null
  triggers: ProjectTrigger[]
  audioFile: string | null
  waveformData: number[] | null
  projectName: string
  sidebarOpen: boolean
  recentTones: RecentTone[]
  nextColorIdx: number

  setProjects: (projects: ProjectData[]) => void
  setCurrentProject: (p: ProjectData | null) => void
  addTrigger: (t: ProjectTrigger) => void
  removeTrigger: (id: string) => void
  updateTrigger: (id: string, updates: Partial<ProjectTrigger>) => void
  setAudioFile: (f: string | null) => void
  setWaveformData: (d: number[] | null) => void
  setProjectName: (n: string) => void
  setSidebarOpen: (v: boolean) => void
  loadProject: (p: ProjectData) => void
  newProject: () => void
  loadDemoProject: () => void
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  triggers: [],
  audioFile: null,
  waveformData: null,
  projectName: 'Untitled',
  sidebarOpen: true,
  recentTones: [],
  nextColorIdx: 0,

  setProjects: (projects) => set({ projects }),
  setCurrentProject: (p) => set({ currentProject: p }),
  addTrigger: (t) => set((s) => {
    const triggers = [...s.triggers, t].sort((a, b) => a.time - b.time)
    const recent = [...s.recentTones]
    const existing = recent.find(r => r.name === t.toneName)
    if (existing) existing.count++
    else recent.push({ name: t.toneName, pc: t.program, count: 1 })
    if (typeof window !== 'undefined') localStorage.setItem('tm_triggers', JSON.stringify(triggers))
    return { triggers, recentTones: recent, nextColorIdx: (s.nextColorIdx + 1) % TRIGGER_COLORS.length }
  }),
  removeTrigger: (id) => set((s) => {
    const triggers = s.triggers.filter(t => t.id !== id)
    if (typeof window !== 'undefined') localStorage.setItem('tm_triggers', JSON.stringify(triggers))
    return { triggers }
  }),
  updateTrigger: (id, updates) => set((s) => {
    const triggers = s.triggers.map(t => t.id === id ? { ...t, ...updates } : t).sort((a, b) => a.time - b.time)
    if (typeof window !== 'undefined') localStorage.setItem('tm_triggers', JSON.stringify(triggers))
    return { triggers }
  }),
  setAudioFile: (f) => {
    if (typeof window !== 'undefined' && f) localStorage.setItem('tm_audioFile', f)
    set({ audioFile: f })
  },
  setWaveformData: (d) => set({ waveformData: d }),
  setProjectName: (n) => {
    if (typeof window !== 'undefined') localStorage.setItem('tm_projectName', n)
    set({ projectName: n })
  },
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  loadProject: (p) => set({
    currentProject: p,
    triggers: p.triggers || [],
    projectName: p.name || 'Untitled',
    audioFile: p.audio?.path || null,
  }),
  newProject: () => set({
    currentProject: { id: crypto.randomUUID(), name: 'Untitled', triggers: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    triggers: [],
    audioFile: null,
    waveformData: null,
    projectName: 'Untitled',
  }),
  loadDemoProject: () => set({
    triggers: DEMO_TRIGGERS,
    projectName: 'Demo Project',
  }),
}))
