import { create } from 'zustand'

export interface ToneTrigger {
  id: string
  time: number          // seconds
  program: number       // MIDI PC 0-127
  toneName: string
  bankMsb?: number
  bankLsb?: number
  color?: string
}

export interface MappingFile {
  filename: string
  pluginName: string
  toneCount: number
  path: string
}

export interface MappingTone {
  pc: number
  name: string
  uid?: string
}

export interface ProjectData {
  id: string
  name: string
  audioFile?: string
  mappingFile?: string
  triggers: ToneTrigger[]
  abLoop?: { startMs: number; endMs: number } | null
  createdAt: string
  updatedAt: string
}

interface MapperState {
  // Connection
  isConnected: boolean
  midiPort: string | null
  availablePorts: string[]

  // Current mapping
  currentMapping: MappingFile | null
  mappingTones: MappingTone[]
  allMappings: MappingFile[]

  // Project
  currentProject: ProjectData | null
  projects: ProjectData[]

  // Playback
  isPlaying: boolean
  positionMs: number
  durationMs: number
  audioFile: string | null

  // Active trigger index (-1 = none)
  activeTriggerIndex: number

  // Actions
  setConnected: (connected: boolean) => void
  setMidiPort: (port: string | null) => void
  setAvailablePorts: (ports: string[]) => void
  setCurrentMapping: (mapping: MappingFile | null) => void
  setMappingTones: (tones: MappingTone[]) => void
  setAllMappings: (mappings: MappingFile[]) => void
  setCurrentProject: (project: ProjectData | null) => void
  setProjects: (projects: ProjectData[]) => void
  setIsPlaying: (playing: boolean) => void
  setPositionMs: (ms: number) => void
  setDurationMs: (ms: number) => void
  setAudioFile: (file: string | null) => void
  setActiveTriggerIndex: (index: number) => void

  // Trigger mutations
  addTrigger: (trigger: ToneTrigger) => void
  removeTrigger: (id: string) => void
  updateTrigger: (id: string, updates: Partial<ToneTrigger>) => void
  reorderTriggers: () => void  // sort by time

  // AB Loop
  setAbLoop: (loop: { startMs: number; endMs: number } | null) => void
}

export const useMapperStore = create<MapperState>((set) => ({
  // Initial state
  isConnected: false,
  midiPort: null,
  availablePorts: [],
  currentMapping: null,
  mappingTones: [],
  allMappings: [],
  currentProject: null,
  projects: [],
  isPlaying: false,
  positionMs: 0,
  durationMs: 0,
  audioFile: null,
  activeTriggerIndex: -1,

  // Actions
  setConnected: (connected) => set({ isConnected: connected }),
  setMidiPort: (port) => set({ midiPort: port }),
  setAvailablePorts: (ports) => set({ availablePorts: ports }),
  setCurrentMapping: (mapping) => set({ currentMapping: mapping }),
  setMappingTones: (tones) => set({ mappingTones: tones }),
  setAllMappings: (mappings) => set({ allMappings: mappings }),
  setCurrentProject: (project) => set({ currentProject: project }),
  setProjects: (projects) => set({ projects: projects }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPositionMs: (ms) => set({ positionMs: ms }),
  setDurationMs: (ms) => set({ durationMs: ms }),
  setAudioFile: (file) => set({ audioFile: file }),
  setActiveTriggerIndex: (index) => set({ activeTriggerIndex: index }),

  addTrigger: (trigger) => set((state) => {
    const triggers = [...(state.currentProject?.triggers || []), trigger].sort((a, b) => a.time - b.time)
    return { currentProject: state.currentProject ? { ...state.currentProject, triggers } : null }
  }),

  removeTrigger: (id) => set((state) => {
    const triggers = (state.currentProject?.triggers || []).filter(t => t.id !== id)
    return { currentProject: state.currentProject ? { ...state.currentProject, triggers } : null }
  }),

  updateTrigger: (id, updates) => set((state) => {
    const triggers = (state.currentProject?.triggers || []).map(t => t.id === id ? { ...t, ...updates } : t)
    return { currentProject: state.currentProject ? { ...state.currentProject, triggers } : null }
  }),

  reorderTriggers: () => set((state) => {
    const triggers = [...(state.currentProject?.triggers || [])].sort((a, b) => a.time - b.time)
    return { currentProject: state.currentProject ? { ...state.currentProject, triggers } : null }
  }),

  setAbLoop: (loop) => set((state) => ({
    currentProject: state.currentProject ? { ...state.currentProject, abLoop: loop } : null
  })),
}))
