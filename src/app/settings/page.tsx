'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, GripVertical, X, Play, Filter } from 'lucide-react'
import { useMapperStore } from '@/stores/mapperStore'
import { usePlaybackStore } from '@/stores/playbackStore'
import { API_BASE } from '@/lib/api'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { DragEndEvent } from '@dnd-kit/core'

type SourceFilter = 'all' | 'user' | 'artists' | 'factory'

function SortableItem({ name, idx, onTest, onRemove }: { name: string; idx: number; onTest: () => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: name })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div ref={setNodeRef} style={style} {...attributes} className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800/50 hover:bg-zinc-800/30 text-sm">
      <button {...listeners} className="cursor-grab touch-none"><GripVertical className="w-3.5 h-3.5 text-zinc-600" /></button>
      <span className="w-8 text-[10px] text-zinc-500 font-mono bg-zinc-800 rounded px-1 py-0.5 text-center">PC{idx}</span>
      <span className="flex-1 text-zinc-200 truncate">{name}</span>
      <span className="text-[9px] text-green-400 bg-green-500/10 rounded px-1 py-0.5">Mapped</span>
      <button onClick={onTest} className="p-1 text-zinc-500 hover:text-green-400" title="Test MIDI"><Play className="w-3 h-3" /></button>
      <button onClick={onRemove} className="p-1 text-zinc-500 hover:text-red-400" title="Remove"><X className="w-3 h-3" /></button>
    </div>
  )
}

export default function SettingsPage() {
  const currentMidiPort = usePlaybackStore((s) => s.currentMidiPort)
  const midiPorts = usePlaybackStore((s) => s.midiPorts)
  const setCurrentMidiPort = usePlaybackStore((s) => s.setCurrentMidiPort)
  const setMidiPorts = usePlaybackStore((s) => s.setMidiPorts)
  const selectedPlugin = useMapperStore((s) => s.selectedPlugin)
  const setSelectedPlugin = useMapperStore((s) => s.setSelectedPlugin)
  const plugins = useMapperStore((s) => s.plugins)
  const setPlugins = useMapperStore((s) => s.setPlugins)
  const presets = useMapperStore((s) => s.presets)
  const setPresets = useMapperStore((s) => s.setPresets)
  const selectedPresets = useMapperStore((s) => s.selectedPresets)
  const togglePreset = useMapperStore((s) => s.togglePreset)
  const selectAllPresets = useMapperStore((s) => s.selectAllPresets)
  const deselectAllPresets = useMapperStore((s) => s.deselectAllPresets)
  const presetOrder = useMapperStore((s) => s.presetOrder)
  const getMappings = useMapperStore((s) => s.getMappings)
  const movePreset = useMapperStore((s) => s.movePreset)
  const loading = useMapperStore((s) => s.loading)
  const setLoading = useMapperStore((s) => s.setLoading)
  const searchQuery = useMapperStore((s) => s.searchQuery)
  const setSearchQuery = useMapperStore((s) => s.setSearchQuery)
  const generatedXml = useMapperStore((s) => s.generatedXml)
  const setGeneratedXml = useMapperStore((s) => s.setGeneratedXml)

  const [showXmlPreview, setShowXmlPreview] = useState(false)
  const [installMsg, setInstallMsg] = useState('')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    fetch(`${API_BASE}/api/midi/ports`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then(d => {
        const raw = d.ports || []
        setMidiPorts(raw.map((p: { name: string } | string) => typeof p === 'string' ? p : p.name))
      })
      .catch(() => { setInstallMsg('⚠ Could not load MIDI ports — is the backend running?') })
  }, [setMidiPorts])

  useEffect(() => {
    fetch(`${API_BASE}/api/plugins`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then(d => setPlugins(d.map((p: { name: string }) => p.name)))
      .catch(() => { setInstallMsg('⚠ Could not load plugins — is the backend running?') })
  }, [setPlugins])

  useEffect(() => {
    if (!selectedPlugin) { setPresets([]); return }
    setLoading(true)
    fetch(`${API_BASE}/api/presets?plugin=${encodeURIComponent(selectedPlugin)}${sourceFilter !== 'all' ? `&source=${sourceFilter}` : ''}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then(d => setPresets(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedPlugin, sourceFilter, setPresets, setLoading])

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
    setInstallMsg('Installing...')
    try {
      const res = await fetch(`${API_BASE}/api/midi/automap`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plugin_name: selectedPlugin, preset_names: mappings.map(m => m.name), start_pc: 0, filename: 'tonemaster-user.xml' }) })
      if (!res.ok) throw new Error(`Automap failed: ${res.status}`)
      const data = await res.json()
      setGeneratedXml(data.xml || '', '')
      setInstallMsg(`✓ Installed to: ${data.installed_path || 'plugin dir'}`); setShowXmlPreview(true)
    } catch (e) { setInstallMsg(`✗ ${e instanceof Error ? e.message : 'Failed to install'}`) }
  }

  const handleGenerateXml = async () => {
    const mappings = getMappings()
    if (!mappings.length) return
    try {
      const res = await fetch(`${API_BASE}/api/midi/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plugin_name: selectedPlugin, mappings: mappings.map(m => ({ pc: m.pc, name: m.name, uid: m.uid })) }) })
      if (!res.ok) throw new Error(`Generate failed: ${res.status}`)
      const d = await res.json()
      setGeneratedXml(d.xml_content, ''); setShowXmlPreview(true)
    } catch (e) { setInstallMsg(`✗ ${e instanceof Error ? e.message : 'Failed to generate XML'}`) }
  }

  return (
    <div className="h-screen bg-[#0a0a0a] text-white flex flex-col overflow-hidden">
      {/* Header — fixed */}
      <header className="flex items-center gap-4 px-6 py-3 border-b border-zinc-800 shrink-0">
        <Link href="/" className="text-zinc-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-lg font-semibold">Tone Presets</h1>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">MIDI Out:</span>
          <select value={currentMidiPort || ''} onChange={e => setCurrentMidiPort(e.target.value || null)} className="bg-zinc-800 text-white rounded px-2 py-1 border border-zinc-700 text-xs">
            <option value="">No port</option>
            {midiPorts.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </header>

      {/* Main — fixed height, no page scroll */}
      <main className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL — scrollable preset list */}
        <div className="w-1/2 border-r border-zinc-800 flex flex-col overflow-hidden">
          <div className="p-4 space-y-3 border-b border-zinc-800 shrink-0">
            <select value={selectedPlugin} onChange={e => { setSelectedPlugin(e.target.value); deselectAllPresets() }} className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 border border-zinc-700 text-sm">
              <option value="">Select plugin...</option>
              {plugins.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {/* Source filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-zinc-500" />
              <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value as SourceFilter)} className="bg-zinc-800 text-white rounded px-2 py-1.5 border border-zinc-700 text-xs flex-1">
                <option value="all">All Presets</option>
                <option value="user">User</option>
                <option value="artists">Artists</option>
                <option value="factory">Factory</option>
              </select>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-zinc-500" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-zinc-800 text-white rounded-lg pl-8 pr-3 py-2 border border-zinc-700 text-sm" placeholder="Search presets..." />
            </div>
            <div className="flex gap-2">
              <button onClick={() => selectAllPresets(filteredPresets.map(p => p.name))} className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs">All</button>
              <button onClick={() => deselectAllPresets(filteredPresets.map(p => p.name))} className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs">None</button>
              <span className="text-xs text-zinc-500 self-center ml-auto">{selectedPresets.size} selected</span>
            </div>
          </div>
          {/* Scrollable preset list */}
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? <p className="text-zinc-500 p-4">Loading presets...</p> : filteredPresets.length === 0 ? <p className="text-zinc-500 p-4">No presets found</p> : filteredPresets.map((p, i) => (
              <label key={p.name} className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer hover:bg-zinc-800/50 text-sm ${selectedPresets.has(p.name) ? 'bg-green-500/10 border border-green-500/20' : 'border border-transparent'}`}>
                <input type="checkbox" checked={selectedPresets.has(p.name)} onChange={() => togglePreset(p.name)} className="accent-green-500" />
                <span className="w-8 text-[10px] text-zinc-600 font-mono">#{i}</span>
                <span className="flex-1 text-zinc-200 truncate">{p.name}</span>
                {p.source && <span className="text-[9px] text-zinc-500 bg-zinc-800 rounded px-1 py-0.5">{p.source}</span>}
                {selectedPresets.has(p.name) && <span className="text-[9px] text-green-400 bg-green-500/10 rounded px-1.5 py-0.5">PC{presetOrder.indexOf(p.name)}</span>}
              </label>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL — fixed width, scroll only on list, actions pinned at bottom */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          {/* Right panel header */}
          <div className="p-4 border-b border-zinc-800 shrink-0 flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-300">Mapping Order (drag to reorder)</h3>
            {presetOrder.length > 0 && (
              <span className="text-[10px] text-green-400 bg-green-500/10 rounded-full px-2 py-0.5">{presetOrder.length} mapped</span>
            )}
          </div>

          {/* Scrollable drag list */}
          <div className="flex-1 overflow-y-auto">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={presetOrder} strategy={verticalListSortingStrategy}>
                {presetOrder.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <p className="text-zinc-600 text-sm">Select presets from the left panel</p>
                    <p className="text-zinc-700 text-xs mt-1">They will appear here for MIDI mapping</p>
                  </div>
                ) :
                  presetOrder.map((name, idx) => (
                    <SortableItem
                      key={name}
                      name={name}
                      idx={idx}
                      onTest={async () => { try { const res = await fetch(`${API_BASE}/api/midi/test`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ port_name: currentMidiPort, program: idx, channel: 0 }) }); if (!res.ok) setInstallMsg(`✗ MIDI test failed (${res.status})`) } catch { setInstallMsg('✗ Cannot reach backend') } }}
                      onRemove={() => togglePreset(name)}
                    />
                  ))
                }
              </SortableContext>
            </DndContext>
          </div>

          {/* FIXED bottom action area — always visible */}
          <div className="p-4 border-t border-zinc-800 space-y-2 shrink-0 bg-zinc-950">
            <button onClick={handleAutoMapInstall} disabled={presetOrder.length === 0}
              className="w-full px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-medium transition-colors">
              Auto Map & Install
            </button>
            <div className="flex gap-2">
              <button onClick={handleGenerateXml} disabled={presetOrder.length === 0}
                className="flex-1 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:text-zinc-700 text-xs transition-colors">
                Generate XML
              </button>
              <Link href="/guide" className="flex-1 text-center px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs">
                MIDI Learn Guide
              </Link>
            </div>
            {installMsg && (
              <p className={`text-xs text-center ${installMsg.startsWith('✓') ? 'text-green-400' : installMsg.startsWith('✗') ? 'text-red-400' : 'text-zinc-400'}`}>
                {installMsg}
              </p>
            )}
            {showXmlPreview && generatedXml && (
              <div className="mt-2">
                <button onClick={() => setShowXmlPreview(!showXmlPreview)} className="text-xs text-zinc-400 hover:text-white">
                  {showXmlPreview ? 'Hide' : 'Show'} XML Preview
                </button>
                <pre className="mt-1 p-2 bg-zinc-800 rounded text-xs text-zinc-400 max-h-32 overflow-auto">{generatedXml}</pre>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
