'use client'

import { X } from 'lucide-react'
import { useMapperStore } from '@/stores/mapperStore'
import { TRIGGER_COLORS } from '@/stores/projectStore'

declare global { interface Window { _tm_ws: WebSocket | null } }

export function TriggerList() {
  const triggers = useMapperStore((s) => s.triggers)
  const activeTriggerIndex = useMapperStore((s) => s.activeTriggerIndex)
  const removeTrigger = useMapperStore((s) => s.removeTrigger)

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toFixed(2).padStart(5, '0')}`
  }

  const send = (cmd: string, pos?: number) => {
    const ws = (window as any)._tm_ws
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'playback_command', command: cmd, position_ms: pos }))
  }

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-[1.5rem_2rem_1fr_5rem_1.5rem] gap-2 px-4 py-2 text-xs text-zinc-500 uppercase tracking-wide border-b border-zinc-800">
        <span>#</span><span>PC</span><span>Preset</span><span>Time</span><span></span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {triggers.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-zinc-600">No triggers yet</div>
        ) : triggers.map((t, idx) => (
          <div key={t.id}
            onClick={() => send('seek', Math.round(t.time * 1000))}
            className={`group grid grid-cols-[1.5rem_2rem_1fr_5rem_1.5rem] gap-2 px-4 py-2 cursor-pointer border-b border-zinc-800/50 transition-colors ${idx === activeTriggerIndex ? 'bg-zinc-800/50 border-l-2 border-l-green-500' : 'hover:bg-zinc-900'}`}>
            <span className="text-xs text-zinc-600 font-mono self-center">{idx + 1}</span>
            <span className="w-4 h-4 rounded-full self-center" style={{ backgroundColor: t.color || TRIGGER_COLORS[idx % TRIGGER_COLORS.length] }} />
            <span className="text-sm self-center truncate text-zinc-200">{t.toneName}</span>
            <span className="text-xs text-zinc-500 font-mono self-center">{formatTime(t.time)}</span>
            <button onClick={e => { e.stopPropagation(); removeTrigger(t.id) }}
              className="opacity-0 group-hover:opacity-100 self-center text-zinc-600 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  )
}
