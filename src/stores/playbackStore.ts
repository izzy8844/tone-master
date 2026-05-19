import { create } from 'zustand'

interface PlaybackState {
  theme: string; setTheme: (t: string) => void
  isPlaying: boolean; currentTick: number; duration: number
  zoom: number; setZoom: (v: number | ((p: number) => number)) => void
  abLoopEnabled: boolean; loopA: number | null; loopB: number | null
  setLoopA: (v: number | null) => void; setLoopB: (v: number | null) => void
  setAbLoopEnabled: (v: boolean) => void; clearABLoop: () => void
  midiPorts: string[]; currentMidiPort: string | null
  lastMidiEvent: { pc?: number; program?: number; name?: string } | null
  wsConnected: boolean; wsStatus: 'connected' | 'disconnected' | 'connecting' | 'error'
  activeTriggerIndex: number
  setIsPlaying: (v: boolean) => void; setCurrentTick: (t: number) => void; setDuration: (d: number) => void
  setMidiPorts: (p: string[]) => void; setCurrentMidiPort: (p: string | null) => void
  setLastMidiEvent: (e: { pc?: number; program?: number; name?: string } | null) => void
  setWsConnected: (v: boolean) => void; setWsStatus: (s: 'connected' | 'disconnected' | 'connecting' | 'error') => void
  setActiveTriggerIndex: (i: number) => void
}

function loadSaved() { if (typeof window === 'undefined') return {}; try { const r = localStorage.getItem('tonemaster_playback'); return r ? JSON.parse(r) : {} } catch { return {} } }
function writeSaved(data: Record<string, unknown>) { if (typeof window === 'undefined') return; try { localStorage.setItem('tonemaster_playback', JSON.stringify(data)) } catch {} }

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  theme: 'dark', setTheme: (t) => set({ theme: t }),
  isPlaying: false, currentTick: 0, duration: 0,
  zoom: 1, setZoom: (v) => set({ zoom: typeof v === 'function' ? v(get().zoom) : v }),
  abLoopEnabled: false, loopA: null, loopB: null,
  setLoopA: (v) => set({ loopA: v }), setLoopB: (v) => set({ loopB: v }),
  setAbLoopEnabled: (v) => set({ abLoopEnabled: v }),
  clearABLoop: () => set({ loopA: null, loopB: null, abLoopEnabled: false }),
  midiPorts: [], currentMidiPort: null, lastMidiEvent: null,
  wsConnected: false, wsStatus: 'disconnected', activeTriggerIndex: -1,
  setIsPlaying: (v) => set({ isPlaying: v }),
  setCurrentTick: (t) => set({ currentTick: t }),
  setDuration: (d) => set({ duration: d }),
  setMidiPorts: (p) => set({ midiPorts: p }),
  setCurrentMidiPort: (p) => set({ currentMidiPort: p }),
  setLastMidiEvent: (e) => set({ lastMidiEvent: e }),
  setWsConnected: (v) => set({ wsConnected: v }),
  setWsStatus: (s) => set({ wsStatus: s }),
  setActiveTriggerIndex: (i) => set({ activeTriggerIndex: i }),
}))

const PERSIST_KEYS = ['zoom', 'currentTick', 'loopA', 'loopB', 'currentMidiPort'] as const

export function hydratePlaybackStore() {
  const raw = loadSaved()
  if (!raw || typeof raw !== 'object') return
  const patch: Record<string, unknown> = {}
  for (const key of PERSIST_KEYS) { if (key in raw) patch[key] = (raw as Record<string, unknown>)[key] }
  if (Object.keys(patch).length) usePlaybackStore.setState(patch as Partial<PlaybackState>)
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
if (typeof window !== 'undefined') {
  let prevPersist = { zoom: 0, currentTick: 0, loopA: null as number | null, loopB: null as number | null, currentMidiPort: null as string | null }
  let prevIsPlaying = false
  usePlaybackStore.subscribe((state) => {
    const curr = { zoom: state.zoom, currentTick: state.currentTick, loopA: state.loopA, loopB: state.loopB, currentMidiPort: state.currentMidiPort }
    const tickChanged = curr.currentTick !== prevPersist.currentTick
    const otherChanged = curr.zoom !== prevPersist.zoom || curr.loopA !== prevPersist.loopA || curr.loopB !== prevPersist.loopB || curr.currentMidiPort !== prevPersist.currentMidiPort
    const stoppedPlaying = prevIsPlaying && !state.isPlaying
    prevIsPlaying = state.isPlaying
    if (!stoppedPlaying && !otherChanged && (!tickChanged || state.isPlaying)) return
    prevPersist = curr
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => writeSaved(curr), 500)
  })
}
