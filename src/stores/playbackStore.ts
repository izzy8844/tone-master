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

function loadSaved() { try { const r = localStorage.getItem('tonemaster_playback'); return r ? JSON.parse(r) : {} } catch { return {} } }
function writeSaved(data: Record<string, unknown>) { try { localStorage.setItem('tonemaster_playback', JSON.stringify(data)) } catch {} }

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

export function hydratePlaybackStore() {
  const s = loadSaved()
  if (Object.keys(s).length) usePlaybackStore.setState(s as any)
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
if (typeof window !== 'undefined') {
  usePlaybackStore.subscribe((state) => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => writeSaved({
      zoom: state.zoom, currentTick: state.currentTick,
      loopA: state.loopA, loopB: state.loopB, currentMidiPort: state.currentMidiPort,
    }), 500)
  })
}
