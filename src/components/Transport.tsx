'use client'
import { Play, Pause, Square, Repeat } from 'lucide-react'
import { useMapperStore } from '@/stores/mapperStore'
import { useWebSocket } from '@/hooks/useWebSocket'

export function Transport() {
  const { isPlaying, positionMs, durationMs, currentProject } = useMapperStore()
  const { sendCommand } = useWebSocket()
  const abLoop = currentProject?.abLoop

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    return `${m}:${String(s % 60).padStart(2, '0')}`
  }

  const progress = durationMs > 0 ? (positionMs / durationMs) * 100 : 0

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    const seekMs = Math.round(pct * durationMs)
    sendCommand('seek', seekMs)
  }

  return (
    <div className="px-6 py-3 flex items-center gap-4 bg-zinc-950 border-t border-zinc-800">
      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => sendCommand(isPlaying ? 'pause' : 'play')}
          className="w-[34px] h-[34px] flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <button
          onClick={() => sendCommand('stop')}
          className="w-[34px] h-[34px] flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
        >
          <Square className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            const store = useMapperStore.getState()
            if (abLoop) {
              store.setAbLoop(null)
            } else {
              const start = Math.max(0, positionMs - 5000)
              const end = Math.min(durationMs, positionMs + 5000)
              store.setAbLoop({ startMs: start, endMs: end })
            }
          }}
          className={`w-[34px] h-[34px] flex items-center justify-center rounded-full transition-colors ${
            abLoop ? 'bg-green-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
          }`}
          title="A-B Loop"
        >
          <Repeat className="w-4 h-4" />
        </button>
      </div>

      {/* Time */}
      <span className="text-xs text-zinc-500 w-12 text-right font-mono">
        {formatTime(positionMs)}
      </span>

      {/* Progress Bar */}
      <div
        className="flex-1 h-1.5 bg-zinc-800 rounded-full cursor-pointer relative"
        onClick={handleSeek}
      >
        {/* AB Loop range highlight */}
        {abLoop && durationMs > 0 && (
          <div
            className="absolute top-0 h-full bg-green-900/40 rounded-full"
            style={{
              left: `${(abLoop.startMs / durationMs) * 100}%`,
              width: `${((abLoop.endMs - abLoop.startMs) / durationMs) * 100}%`
            }}
          />
        )}
        {/* Progress */}
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Duration */}
      <span className="text-xs text-zinc-500 w-12 font-mono">
        {formatTime(durationMs)}
      </span>
    </div>
  )
}
