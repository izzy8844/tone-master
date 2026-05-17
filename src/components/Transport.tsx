'use client'
import { Play, Pause, Square, Repeat, SkipBack, SkipForward } from 'lucide-react'
import { usePlaybackStore } from '@/stores/playbackStore'
import { useProjectStore } from '@/stores/projectStore'

export function Transport() {
  const { isPlaying, currentTick, duration } = usePlaybackStore()

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60); const s = Math.floor(t % 60); const ms = Math.floor((t % 1) * 100)
    return `${m}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTick / duration) * 100 : 0

  const send = (cmd: string, pos?: number) => {
    const ws = (window as any)._tm_ws
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'playback_command', command: cmd, position_ms: pos }))
  }

  return (
    <div className="px-6 py-3 flex items-center gap-4 bg-zinc-950 border-t border-zinc-800">
      <div className="flex items-center gap-1.5">
        <button onClick={() => send('seek', Math.max(0, (currentTick - 5) * 1000))} className="w-[34px] h-[34px] flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200"><SkipBack className="w-4 h-4" /></button>
        <button onClick={() => send(isPlaying ? 'pause' : 'play')} className="w-[34px] h-[34px] flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200">{isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}</button>
        <button onClick={() => send('stop')} className="w-[34px] h-[34px] flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200"><Square className="w-3.5 h-3.5" /></button>
        <button onClick={() => send('seek', Math.min(duration, (currentTick + 5)) * 1000)} className="w-[34px] h-[34px] flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200"><SkipForward className="w-4 h-4" /></button>
      </div>
      <span className="text-xs text-zinc-500 w-20 text-right font-mono">{formatTime(currentTick)}</span>
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full cursor-pointer relative"
        onClick={e => { const r = e.currentTarget.getBoundingClientRect(); send('seek', Math.round(((e.clientX - r.left) / r.width) * duration * 1000)) }}>
        <div className="h-full bg-green-500 rounded-full" style={{ width: `${progress}%` }} />
      </div>
      <span className="text-xs text-zinc-500 w-20 font-mono">{formatTime(duration)}</span>
    </div>
  )
}
