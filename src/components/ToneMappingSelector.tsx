'use client'
import { ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useMapperStore, type MappingTone } from '@/stores/mapperStore'

export function ToneMappingSelector() {
  const { activeMappingFile, activeMappingTones, setActiveMappingFile, setActiveMappingTones } = useMapperStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-zinc-600 transition-colors">
        <span className="text-sm text-zinc-200">{activeMappingFile || 'Select Mapping...'}</span>
        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 w-64 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-3 text-sm text-zinc-500">Mapping: {activeMappingFile || 'None'}</div>
          {activeMappingTones.map(t => (
            <div key={`${t.pc}-${t.name}`} className="px-3 py-1.5 text-sm text-zinc-400">{t.name} (PC {t.pc})</div>
          ))}
        </div>
      )}
    </div>
  )
}
