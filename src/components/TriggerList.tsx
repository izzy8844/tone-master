'use client'

import { X } from 'lucide-react'
import { useMapperStore } from '@/stores/mapperStore'
import { useWebSocket } from '@/hooks/useWebSocket'

export function TriggerList() {
  const { currentProject, activeTriggerIndex } = useMapperStore()
  const { sendCommand } = useWebSocket()
  const triggers = currentProject?.triggers || []

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toFixed(1).padStart(4, '0')}`
  }

  const handleDelete = (id: string) => {
    const store = useMapperStore.getState()
    store.removeTrigger(id)
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="grid grid-cols-[2rem_1fr_4rem_2rem] gap-2 px-4 py-2 text-xs text-zinc-500 uppercase tracking-wide border-b border-zinc-800">
        <span>#</span>
        <span>Tone Preset</span>
        <span>Time</span>
        <span></span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {triggers.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-zinc-600">
            No triggers yet. Click &quot;+&quot; to add a tone trigger.
          </div>
        ) : (
          triggers.map((t, idx) => (
            <div
              key={t.id}
              onClick={() => sendCommand('seek', Math.round(t.time * 1000))}
              className={`group grid grid-cols-[2rem_1fr_4rem_2rem] gap-2 px-4 py-2 cursor-pointer border-b border-zinc-800/50 transition-colors ${
                idx === activeTriggerIndex
                  ? 'bg-zinc-800/50 border-l-2 border-l-green-500'
                  : 'hover:bg-zinc-900'
              }`}
            >
              <span className="text-xs text-zinc-600 font-mono self-center">
                {idx + 1}
              </span>
              <span className={`text-sm self-center truncate ${idx === activeTriggerIndex ? 'text-green-400' : 'text-zinc-200'}`}>
                {t.toneName}
              </span>
              <span className="text-xs text-zinc-500 font-mono self-center">
                {formatTime(t.time)}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(t.id) }}
                className="opacity-0 group-hover:opacity-100 self-center justify-self-center text-zinc-600 hover:text-red-400 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
