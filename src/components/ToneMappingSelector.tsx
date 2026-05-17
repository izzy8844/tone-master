'use client'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useMapperStore } from '@/stores/mapperStore'

export function ToneMappingSelector() {
  const { currentMapping, allMappings, setCurrentMapping, setMappingTones } = useMapperStore()
  const [open, setOpen] = useState(false)

  const handleSelect = async (mapping: typeof currentMapping) => {
    if (!mapping) return
    setCurrentMapping(mapping)
    setOpen(false)
    // Load tones for this mapping
    const res = await fetch(`/api/midi/mappings/${encodeURIComponent(mapping.pluginName)}/${encodeURIComponent(mapping.filename)}/tones`)
    const tones = await res.json()
    setMappingTones(tones)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-zinc-600 transition-colors"
      >
        <span className="text-sm text-zinc-200">
          {currentMapping ? currentMapping.filename : 'Select Mapping...'}
        </span>
        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 w-64 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden">
          {allMappings.length === 0 ? (
            <div className="p-3 text-sm text-zinc-500">No mappings found</div>
          ) : (
            allMappings.map(m => (
              <button
                key={m.filename}
                onClick={() => handleSelect(m)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-800 transition-colors ${
                  currentMapping?.filename === m.filename ? 'text-green-400 bg-zinc-800' : 'text-zinc-200'
                }`}
              >
                <div>{m.filename}</div>
                <div className="text-xs text-zinc-500">{m.toneCount} tones · {m.pluginName}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
