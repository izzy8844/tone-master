'use client'

import { useEffect, useState } from 'react'
import { FileText, ChevronDown, Check, Loader2 } from 'lucide-react'
import { useMapperStore } from '@/stores/mapperStore'
import { fetchMappingFiles, fetchMappingTones, type MappingFileInfo } from '@/lib/api'

/**
 * ToneMappingSelector — user selects an XML mapping file, then tones from that file
 * are loaded and used in ToneAddDialog. Same flow as reference project:
 * 1. Fetch all mapping XML files for the selected plugin
 * 2. User picks one from dropdown (auto-selects first if none persisted)
 * 3. Tones from the selected XML are loaded into store
 */
export function ToneMappingSelector() {
  const { selectedPlugin, activeMappingFile, setActiveMappingFile, setActiveMappingTones } = useMapperStore()
  const [mappingFiles, setMappingFiles] = useState<MappingFileInfo[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedPlugin) return
    let cancelled = false

    const loadTonesForFile = async (plugin: string, filename: string) => {
      try {
        const data = await fetchMappingTones(plugin, filename)
        if (!cancelled) setActiveMappingTones(data.tones || [])
      } catch {
        if (!cancelled) setActiveMappingTones([])
      }
    }

    ;(async () => {
      setLoading(true)
      try {
        const data = await fetchMappingFiles(selectedPlugin)
        if (cancelled) return
        const files = data.files || []
        setMappingFiles(files)

        if (files.length === 0) {
          // No mapping files available
          setActiveMappingFile('')
          setActiveMappingTones([])
        } else {
          // Check if previously selected file still exists
          const currentFile = useMapperStore.getState().activeMappingFile
          const match = files.find(f => f.filename === currentFile)
          if (match) {
            await loadTonesForFile(selectedPlugin, currentFile)
          } else {
            // Auto-select first file
            setActiveMappingFile(files[0].filename)
            await loadTonesForFile(selectedPlugin, files[0].filename)
          }
        }
      } catch {
        if (!cancelled) {
          setMappingFiles([])
          setActiveMappingTones([])
        }
      }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [selectedPlugin, setActiveMappingFile, setActiveMappingTones])

  const handleSelect = async (filename: string) => {
    if (!selectedPlugin) return
    setActiveMappingFile(filename)
    setOpen(false)
    try {
      const data = await fetchMappingTones(selectedPlugin, filename)
      setActiveMappingTones(data.tones || [])
    } catch {
      setActiveMappingTones([])
    }
  }

  if (!selectedPlugin) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-500">
        <FileText size={12} className="text-zinc-600" />
        <span>Select a plugin in Settings first</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-400">
        <Loader2 size={12} className="animate-spin text-green-400" />
        <span>Loading mappings...</span>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-zinc-600 transition-colors text-xs"
      >
        <FileText size={12} className="text-green-400 shrink-0" />
        <span className="truncate max-w-[180px] text-zinc-200">
          {activeMappingFile
            ? activeMappingFile
            : mappingFiles.length === 0
              ? 'No mapping files'
              : 'Select mapping...'}
        </span>
        {mappingFiles.length > 0 && (
          <ChevronDown size={12} className={`text-zinc-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && mappingFiles.length > 0 && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1.5 w-64 min-w-[220px] rounded-lg overflow-hidden z-50 bg-zinc-900 border border-zinc-700 shadow-xl">
            {mappingFiles.map((file) => {
              const isActive = file.filename === activeMappingFile
              return (
                <button
                  key={file.filename}
                  onClick={() => handleSelect(file.filename)}
                  className={`flex items-center gap-2.5 w-full px-4 py-2.5 text-xs transition-all text-left ${isActive ? 'text-green-400 bg-green-500/5' : 'text-zinc-300 hover:bg-zinc-800'}`}
                >
                  {isActive && <Check size={11} className="shrink-0" />}
                  {!isActive && <div className="w-[11px] shrink-0" />}
                  <span className="truncate flex-1">{file.filename}</span>
                  <span className="text-zinc-500 shrink-0">{file.tone_count} tones</span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {open && mappingFiles.length === 0 && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1.5 w-64 rounded-lg overflow-hidden z-50 bg-zinc-900 border border-zinc-700 shadow-xl">
            <div className="px-4 py-4 text-xs text-center text-zinc-500">
              No mapping files found.<br />
              <span className="text-zinc-400">Go to Settings → MIDI Tone Mapping to generate one.</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
