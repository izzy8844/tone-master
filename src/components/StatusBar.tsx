'use client'
import { usePlaybackStore } from '@/stores/playbackStore'

export function StatusBar() {
  const { wsConnected, currentMidiPort, isPlaying } = usePlaybackStore()

  return (
    <footer className="h-7 px-6 flex items-center justify-between bg-zinc-950 border-t border-zinc-800 text-xs">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-zinc-500">{wsConnected ? 'Connected' : 'Disconnected'}</span>
        </span>
        {currentMidiPort && <span className="text-zinc-400">MIDI: {currentMidiPort}</span>}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-zinc-500">{isPlaying ? 'Playing' : 'Stopped'}</span>
      </div>
    </footer>
  )
}
