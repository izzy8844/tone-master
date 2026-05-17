// Comprehensive mapperStore — includes playback, project, and mapping state
import { create } from 'zustand'

// Types
export interface PresetInfo { name: string; path: string; source: string; uid: string | null }
export interface MappingTone { pc: number; name: string; uid?: string | null }
export interface ToneTrigger { id: string; time: number; program: number; toneName: string; color: string; bankMsb?: number }
export interface ProjectData { id: string; name: string; audioFile?: string; triggers: ToneTrigger[]; abLoop?: { startMs: number; endMs: number } | null; createdAt: string; updatedAt: string }
export interface MappingFile { filename: string; pluginName: string; toneCount: number; path: string }

interface MapperState {
  // Playback
  isPlaying: boolean; currentTick: number; duration: number; positionMs: number; durationMs: number
  zoom: number; abLoopEnabled: boolean; loopA: number | null; loopB: number | null
  isConnected: boolean; wsStatus: string; activeTriggerIndex: number
  // Project
  projects: ProjectData[]; currentProject: ProjectData | null; triggers: ToneTrigger[]
  audioFile: string | null; waveformData: number[] | null; projectName: string
  sidebarOpen: boolean; audioDurationSec: number
  // Mapper
  midiPort: string | null; selectedPlugin: string; plugins: string[]; availablePorts: string[]
  presets: PresetInfo[]; selectedPresets: Set<string>; presetOrder: string[]
  loading: boolean; searchQuery: string; sourceFilter: string
  currentMapping: MappingFile | null; allMappings: MappingFile[]; mappingTones: MappingTone[]
  generatedXml: string; targetPath: string; installedPath: string
  activeMappingFile: string; activeMappingTones: MappingTone[]

  // Playback actions
  setIsPlaying: (v: boolean) => void; setCurrentTick: (t: number) => void
  setDuration: (d: number) => void; setPositionMs: (ms: number) => void; setDurationMs: (ms: number) => void
  setConnected: (v: boolean) => void; setWsStatus: (s: string) => void
  setActiveTriggerIndex: (i: number) => void; setAbLoop: (loop: {startMs:number;endMs:number}|null) => void
  // Project actions
  setProjects: (p: ProjectData[]) => void; setCurrentProject: (p: ProjectData|null) => void
  addTrigger: (t: ToneTrigger) => void; removeTrigger: (id: string) => void
  updateTrigger: (id: string, updates: Partial<ToneTrigger>) => void
  setAudioFile: (f: string|null) => void; setWaveformData: (d: number[]|null) => void
  setProjectName: (n: string) => void; setSidebarOpen: (v: boolean) => void; toggleSidebar: () => void
  setAudioDurationSec: (s: number) => void
  // Mapper actions
  setMidiPort: (port: string|null) => void; setAvailablePorts: (ports: string[]) => void
  setSelectedPlugin: (plugin: string) => void; setPlugins: (plugins: string[]) => void
  setPresets: (presets: PresetInfo[]) => void
  togglePreset: (name: string) => void; selectAllPresets: (names?: string[]) => void
  deselectAllPresets: (names?: string[]) => void; movePreset: (fromIdx: number, toIdx: number) => void
  getMappings: () => Array<{name:string;uid:string;pc:number}>
  setCurrentMapping: (m: MappingFile|null) => void; setAllMappings: (m: MappingFile[]) => void
  setMappingTones: (t: MappingTone[]) => void
  setGeneratedXml: (xml: string, path: string) => void; setInstalledPath: (path: string) => void
  setActiveMappingFile: (f: string) => void; setActiveMappingTones: (t: MappingTone[]) => void
  setSearchQuery: (q: string) => void; setSourceFilter: (f: string) => void; setLoading: (l: boolean) => void
}

export const useMapperStore = create<MapperState>((set, get) => ({
  // Playback state
  isPlaying: false, currentTick: 0, duration: 0, positionMs: 0, durationMs: 0, zoom: 1,
  abLoopEnabled: false, loopA: null, loopB: null, isConnected: false, wsStatus: 'disconnected',
  activeTriggerIndex: -1,
  // Project state
  projects: [], currentProject: null, triggers: [], audioFile: null, waveformData: null,
  projectName: 'Untitled', sidebarOpen: true, audioDurationSec: 0,
  // Mapper state
  midiPort: null, selectedPlugin: '', plugins: [], availablePorts: [],
  presets: [], selectedPresets: new Set(), presetOrder: [], loading: false,
  searchQuery: '', sourceFilter: 'All Sources',
  currentMapping: null, allMappings: [], mappingTones: [],
  generatedXml: '', targetPath: '', installedPath: '',
  activeMappingFile: typeof window !== 'undefined' ? localStorage.getItem('tonemaster_active_mapping') || '' : '',
  activeMappingTones: [],

  // Playback actions
  setIsPlaying: (v) => set({ isPlaying: v }),
  setCurrentTick: (t) => set({ currentTick: t }),
  setDuration: (d) => set({ duration: d }),
  setPositionMs: (ms) => set({ positionMs: ms }),
  setDurationMs: (ms) => set({ durationMs: ms }),
  setConnected: (v) => set({ isConnected: v }),
  setWsStatus: (s) => set({ wsStatus: s }),
  setActiveTriggerIndex: (i) => set({ activeTriggerIndex: i }),
  setAbLoop: (loop) => set((state) => ({
    currentProject: state.currentProject ? { ...state.currentProject, abLoop: loop } : null
  })),
  // Project actions
  setProjects: (p) => set({ projects: p }),
  setCurrentProject: (p) => set({ currentProject: p }),
  addTrigger: (t) => set((s) => {
    const triggers = [...s.triggers, t].sort((a, b) => a.time - b.time)
    return { triggers, currentProject: s.currentProject ? { ...s.currentProject, triggers } : null }
  }),
  removeTrigger: (id) => set((s) => {
    const triggers = s.triggers.filter(t => t.id !== id)
    return { triggers, currentProject: s.currentProject ? { ...s.currentProject, triggers } : null }
  }),
  updateTrigger: (id, u) => set((s) => {
    const triggers = s.triggers.map(t => t.id === id ? { ...t, ...u } : t).sort((a, b) => a.time - b.time)
    return { triggers, currentProject: s.currentProject ? { ...s.currentProject, triggers } : null }
  }),
  setAudioFile: (f) => set({ audioFile: f }),
  setWaveformData: (d) => set({ waveformData: d }),
  setProjectName: (n) => set({ projectName: n }),
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setAudioDurationSec: (s) => set({ audioDurationSec: s }),
  // Mapper actions
  setMidiPort: (p) => set({ midiPort: p }),
  setAvailablePorts: (p) => set({ availablePorts: p }),
  setSelectedPlugin: (plugin) => {
    if (typeof window !== 'undefined') localStorage.setItem('tonemaster_selected_plugin', plugin)
    set({ selectedPlugin: plugin })
  },
  setPlugins: (p) => set({ plugins: p }),
  setPresets: (p) => set({ presets: p }),
  togglePreset: (name) => set((s) => {
    const sp = new Set(s.selectedPresets); const order = [...s.presetOrder]
    if (sp.has(name)) { sp.delete(name); order.splice(order.indexOf(name), 1) }
    else { sp.add(name); order.push(name) }
    return { selectedPresets: sp, presetOrder: order }
  }),
  selectAllPresets: (names) => set((s) => {
    const all = names || s.presets.map(p => p.name)
    return { selectedPresets: new Set(all), presetOrder: [...all] }
  }),
  deselectAllPresets: (names) => set((s) => {
    if (names) {
      const sp = new Set(s.selectedPresets); const order = s.presetOrder.filter(n => !names.includes(n))
      names.forEach(n => sp.delete(n)); return { selectedPresets: sp, presetOrder: order }
    }
    return { selectedPresets: new Set(), presetOrder: [] }
  }),
  movePreset: (from, to) => set((s) => {
    const order = [...s.presetOrder]; const [moved] = order.splice(from, 1); order.splice(to, 0, moved)
    return { presetOrder: order }
  }),
  getMappings: () => {
    const { presetOrder, presets } = get()
    return presetOrder.map((name, idx) => {
      const p = presets.find(pr => pr.name === name)
      return { name, uid: (p as any)?.uid_path || (p as any)?.uid || '', pc: idx }
    })
  },
  setCurrentMapping: (m) => set({ currentMapping: m }),
  setAllMappings: (m) => set({ allMappings: m }),
  setMappingTones: (t) => set({ mappingTones: t }),
  setGeneratedXml: (xml, path) => set({ generatedXml: xml, targetPath: path }),
  setInstalledPath: (p) => set({ installedPath: p }),
  setActiveMappingFile: (f) => {
    if (typeof window !== 'undefined') localStorage.setItem('tonemaster_active_mapping', f)
    set({ activeMappingFile: f })
  },
  setActiveMappingTones: (t) => set({ activeMappingTones: t }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSourceFilter: (f) => set({ sourceFilter: f }),
  setLoading: (l) => set({ loading: l }),
}))
