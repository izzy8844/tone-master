'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, GripVertical, X, Play } from 'lucide-react'
import { useMapperStore } from '@/stores/mapperStore'
import { usePlaybackStore } from '@/stores/playbackStore'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { DragEndEvent } from '@dnd-kit/core'

function SortableItem({ name, idx, onTest, onRemove }: { name: string; idx: number; onTest: () => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: name })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div ref={setNodeRef} style={style} {...attributes} className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800/50 hover:bg-zinc-800/30 text-sm">
      <button {...listeners} className="cursor-grab touch-none"><GripVertical className="w-3.5 h-3.5 text-zinc-600" /></button>
      <span className="w-6 text-xs text-zinc-500 font-mono">#{idx}</span>
      <span className="flex-1 text-zinc-200 truncate">{name}</span>
      <button onClick={onTest} className="p-1 text-zinc-500 hover:text-green-400"><Play className="w-3 h-3" /></button>
      <button onClick={onRemove} className="p-1 text-zinc-500 hover:text-red-400"><X className="w-3 h-3" /></button>
    </div>
  )
}

export default function SettingsPage() {
  const { currentMidiPort, midiPorts, setCurrentMidiPort, setMidiPorts } = usePlaybackStore()
  const {
    selectedPlugin, setSelectedPlugin, plugins, setPlugins,
    presets, setPresets, selectedPresets, togglePreset, selectAllPresets, deselectAllPresets,
    presetOrder, getMappings, movePreset, loading, setLoading, searchQuery, setSearchQuery,
    generatedXml, setGeneratedXml, installedPath, setInstalledPath,
  } = useMapperStore()

  const [showXmlPreview, setShowXmlPreview] = useState(false)
  const [installMsg, setInstallMsg] = useState('')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    fetch('/api/midi/ports').then(r => r.json()).then(d => setMidiPorts(d.ports?.map((p: any) => p.name) || [])).catch(() => {})
  }, [setMidiPorts])

  useEffect(() => {
    fetch('/api/plugins').then(r => r.json()).then(d => setPlugins(d.map((p: any) => p.name))).catch(() => {})
  }, [setPlugins])

  useEffect(() => {
    if (!selectedPlugin) { setPresets([]); return }
    setLoading(true)
    fetch(`/api/presets?plugin=${encodeURIComponent(selectedPlugin)}`).then(r => r.json()).then(d => setPresets(d)).catch(() => {}).finally(() => setLoading(false))
  }, [selectedPlugin, setPresets, setLoading])

  const filteredPresets = presets.filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromIdx = presetOrder.indexOf(String(active.id))
    const toIdx = presetOrder.indexOf(String(over.id))
    if (fromIdx >= 0 && toIdx >= 0) movePreset(fromIdx, toIdx)
  }

  const handleAutoMapInstall = async () => {
    const mappings = getMappings()
    if (!mappings.length) return
    try {
      const res = await fetch('/api/midi/automap', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plugin_name: selectedPlugin, preset_names: mappings.map(m => m.name), start_pc: 0 }) })
      const data = await res.json()
      setGeneratedXml(data.xml_content, '')
      await fetch('/api/midi/install', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plugin_name: selectedPlugin, xml_content: data.xml_content, filename: data.filename }) })
      setInstallMsg('Installed!'); setShowXmlPreview(true)
    } catch { setInstallMsg('Failed') }
  }

  const handleGenerateXml = () => {
    const mappings = getMappings()
    if (!mappings.length) return
    fetch('/api/midi/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plugin_name: selectedPlugin, mappings: mappings.map(m => ({ pc: m.pc, name: m.name, uid: m.uid })) }) }).then(r => r.json()).then(d => { setGeneratedXml(d.xml_content, ''); setShowXmlPreview(true) })
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <header className="flex items-center gap-4 px-6 py-3 border-b border-zinc-800 shrink-0">
        <Link href="/" className="text-zinc-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-lg font-semibold">Tone Presets</h1>
      </header>
      <main className="flex-1 flex overflow-hidden">
        <div className="w-1/2 border-r border-zinc-800 flex flex-col overflow-hidden">
          <div className="p-4 space-y-3 border-b border-zinc-800 shrink-0">
            <select value={selectedPlugin} onChange={e => { setSelectedPlugin(e.target.value); deselectAllPresets() }} className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 border border-zinc-700 text-sm">
              <option value="">Select plugin...</option>
              {plugins.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-zinc-500" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-zinc-800 text-white rounded-lg pl-8 pr-3 py-2 border border-zinc-700 text-sm" placeholder="Search..." />
            </div>
            <div className="flex gap-2">
              <button onClick={() => selectAllPresets(filteredPresets.map(p => p.name))} className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs">All</button>
              <button onClick={() => deselectAllPresets(filteredPresets.map(p => p.name))} className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs">None</button>
              <span className="text-xs text-zinc-500 self-center ml-auto">{selectedPresets.size} selected</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? <p className="text-zinc-500 p-4">Loading...</p> : filteredPresets.length === 0 ? <p className="text-zinc-500 p-4">No presets found</p> : filteredPresets.map(p => (
              <label key={p.name} className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer hover:bg-zinc-800/50 text-sm ${selectedPresets.has(p.name) ? 'bg-green-500/10' : ''}`}>
                <input type="checkbox" checked={selectedPresets.has(p.name)} onChange={() => togglePreset(p.name)} className="accent-green-500" />
                <span className="flex-1 text-zinc-200 truncate">{p.name}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-zinc-800 shrink-0"><h3 className="text-sm font-medium text-zinc-300">Selected (drag to reorder)</h3></div>
          <div className="flex-1 overflow-y-auto">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={presetOrder} strategy={verticalListSortingStrategy}>
                {presetOrder.length === 0 ? <p className="text-zinc-600 text-sm p-4">Select presets from the left panel</p> :
                  presetOrder.map((name, idx) => (
                    <SortableItem
                      key={name}
                      name={name}
                      idx={idx}
                      onTest={async () => { await fetch('/api/midi/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ port_name: currentMidiPort, program: idx, channel: 0 }) }) }}
                      onRemove={() => togglePreset(name)}
                    />
                  ))
                }
              </SortableContext>
            </DndContext>
          </div>
          <div className="p-4 border-t border-zinc-800 space-y-2 shrink-0">
            <button onClick={handleAutoMapInstall} disabled={presetOrder.length === 0} className="w-full px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 text-white text-sm font-medium">Auto Map & Install</button>
            <button onClick={handleGenerateXml} disabled={presetOrder.length === 0} className="w-full px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs">Generate XML</button>
            <Link href="/guide" className="block text-center px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs">MIDI Learn Guide</Link>
            {installMsg && <p className="text-xs text-green-400 text-center">{installMsg}</p>}
            {showXmlPreview && generatedXml && (
              <div className="mt-2">
                <button onClick={() => setShowXmlPreview(!showXmlPreview)} className="text-xs text-zinc-400 hover:text-white">XML Preview</button>
                <pre className="mt-1 p-2 bg-zinc-800 rounded text-xs text-zinc-400 max-h-40 overflow-auto">{generatedXml}</pre>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
