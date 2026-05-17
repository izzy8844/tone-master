'use client'

import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { useProjectStore, PRESET_TONES } from '@/stores/projectStore'
import { useMapperStore } from '@/stores/mapperStore'
import { useGatekeeper } from '@/hooks/useGatekeeper'

interface Props { open: boolean; onClose: () => void; time: number }

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60); const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function ToneAddDialog({ open, onClose, time }: Props) {
  const addTrigger = useProjectStore((s) => s.addTrigger)
  const { guard } = useGatekeeper()
  const [customName, setCustomName] = useState('')
  const [customPC, setCustomPC] = useState('')
  const mappingTones = useMapperStore((s) => s.activeMappingTones)

  if (!open) return null

  const handleAdd = (toneName: string, program: number) => {
    guard('add_trigger', () => { addTrigger(time, program, toneName); onClose() })
  }

  const displayTones = mappingTones.length > 0
    ? mappingTones.map(t => ({ name: t.name, pc: t.pc }))
    : PRESET_TONES

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#18181b] rounded-2xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div><h2 className="text-lg font-semibold text-white">Add Tone</h2><p className="text-xs text-zinc-500">at {formatTime(time)}</p></div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X className="w-5 h-5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {displayTones.map((p) => (
            <button key={`${p.pc}-${p.name}`} onClick={() => handleAdd(p.name, p.pc)}
              className="flex items-center gap-3 p-3 rounded-lg border border-zinc-700 hover:border-green-500/50 hover:bg-zinc-800 transition-colors text-left">
              <div className="min-w-0"><div className="text-sm text-zinc-200 truncate">{p.name}</div><div className="text-xs text-zinc-500">PC {p.pc}</div></div>
            </button>
          ))}
        </div>
        <div className="border-t border-zinc-700 pt-4">
          <p className="text-xs text-zinc-500 mb-3">Custom Tone</p>
          <div className="flex gap-2">
            <input type="text" placeholder="Tone name" value={customName} onChange={e => setCustomName(e.target.value)}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-green-500 focus:outline-none" />
            <input type="number" placeholder="PC#" min={0} max={127} value={customPC} onChange={e => setCustomPC(e.target.value)}
              className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-green-500 focus:outline-none" />
            <button onClick={() => { if (customName.trim() && customPC.trim()) { handleAdd(customName.trim(), parseInt(customPC)); setCustomName(''); setCustomPC('') } }}
              className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30"><Plus className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  )
}
