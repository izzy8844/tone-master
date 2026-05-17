import { create } from 'zustand'

interface PlaybackState {
  isPlaying: boolean
  currentTick: number
  duration: number
  zoom: number
  abLoopEnabled: boolean
  loopA: number | null
  loopB: number | null
  midiPorts: string[]
  currentMidiPort: string | null
  wsConnected: boolean
  wsStatus: 'connected' | 'disconnected' | 'connecting' | 'error'
  activeTriggerIndex: number
  lastMidiEvent: { pc: number; name: string } | null

  setIsPlaying: (v: boolean) => void
  setCurrentTick: (t: number) => void
  setDuration: (d: number) => void
  setZoom: (z: number) => void
  setABLoop: (enabled: boolean, a: number | null, b: number | null) => void
  setMidiPorts: (ports: string[]) => void
  setCurrentMidiPort: (port: string | null) => void
  setWsConnected: (v: boolean) => void
  setWsStatus: (s: PlaybackState['wsStatus']) => void
  setActiveTriggerIndex: (i: number) => void
  setLastMidiEvent: (e: { pc: number; name: string } | null) => void
}

const saved = typeof window !== 'undefined' ? {
  zoom: Number(localStorage.getItem('tm_zoom')) || 1,
  currentTick: Number(localStorage.getItem('tm_tick')) || 0,
  loopA: localStorage.getItem('tm_loopA') ? Number(localStorage.getItem('tm_loopA')) : null,
  loopB: localStorage.getItem('tm_loopB') ? Number(localStorage.getItem('tm_loopB')) : null,
  currentMidiPort: localStorage.getItem('tm_midiPort') || null,
} : {}

export const usePlaybackStore = create<PlaybackState>((set) => ({
  isPlaying: false,
  currentTick: saved.currentTick || 0,
  duration: 0,
  zoom: saved.zoom || 1,
  abLoopEnabled: false,
  loopA: saved.loopA || null,
  loopB: saved.loopB || null,
  midiPorts: [],
  currentMidiPort: saved.currentMidiPort || null,
  wsConnected: false,
  wsStatus: 'disconnected',
  activeTriggerIndex: -1,
  lastMidiEvent: null,

  setIsPlaying: (v) => set({ isPlaying: v }),
  setCurrentTick: (t) => {
    if (typeof window !== 'undefined') localStorage.setItem('tm_tick', String(t))
    set({ currentTick: t })
  },
  setDuration: (d) => set({ duration: d }),
  setZoom: (z) => {
    if (typeof window !== 'undefined') localStorage.setItem('tm_zoom', String(z))
    set({ zoom: z })
  },
  setABLoop: (enabled, a, b) => {
    if (typeof window !== 'undefined') {
      if (a != null) localStorage.setItem('tm_loopA', String(a))
      if (b != null) localStorage.setItem('tm_loopB', String(b))
    }
    set({ abLoopEnabled: enabled, loopA: a, loopB: b })
  },
  setMidiPorts: (ports) => set({ midiPorts: ports }),
  setCurrentMidiPort: (port) => {
    if (typeof window !== 'undefined' && port) localStorage.setItem('tm_midiPort', port)
    set({ currentMidiPort: port })
  },
  setWsConnected: (v) => set({ wsConnected: v }),
  setWsStatus: (s) => set({ wsStatus: s }),
  setActiveTriggerIndex: (i) => set({ activeTriggerIndex: i }),
  setLastMidiEvent: (e) => set({ lastMidiEvent: e }),
}))

// Auto-save changed fields
if (typeof window !== 'undefined') {
  usePlaybackStore.subscribe((state, prev) => {
    if (state.zoom !== prev.zoom) localStorage.setItem('tm_zoom', String(state.zoom))
    if (state.currentTick !== prev.currentTick) localStorage.setItem('tm_tick', String(state.currentTick))
    if (state.currentMidiPort !== prev.currentMidiPort && state.currentMidiPort)
      localStorage.setItem('tm_midiPort', state.currentMidiPort)
  })
}
