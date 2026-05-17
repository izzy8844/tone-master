'use client'
import { useMapperStore } from '@/stores/mapperStore'

export function StatusBar() {
  const { isConnected, midiPort, isPlaying, currentMapping } = useMapperStore()

  return (
    <footer className="h-7 px-6 flex items-center justify-between bg-zinc-950 border-t border-zinc-800 text-xs">
      <div className="flex items-center gap-4">
        {/* Connection */}
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-zinc-500">{isConnected ? 'Connected' : 'Disconnected'}</span>
        </span>

        {/* MIDI Port */}
        {midiPort && (
          <span className="text-zinc-400">MIDI: {midiPort}</span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Current Mapping */}
        {currentMapping && (
          <span className="text-zinc-500">{currentMapping.filename}</span>
        )}

        {/* Play state */}
        <span className="text-zinc-500">
          {isPlaying ? '▶ Playing' : '■ Stopped'}
        </span>
      </div>
    </footer>
  )
}
