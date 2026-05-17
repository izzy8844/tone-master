'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, GripVertical, X, Plus, Trash2, Play, Download, Upload } from 'lucide-react'
import { useMapperStore } from '@/stores/mapperStore'

export default function SettingsPage() {
  const {
    midiPort, availablePorts, setMidiPort, setAvailablePorts,
    selectedPlugin, setSelectedPlugin, plugins, setPlugins,
    presets, setPresets, selectedPresets, togglePreset, selectAllPresets, deselectAllPresets,
    presetOrder, movePreset, getMappings,
    searchQuery, setSearchQuery, sourceFilter, setSourceFilter, loading, setLoading,
    generatedXml, setGeneratedXml, installedPath, setInstalledPath,
  } = useMapperStore()

  const [showXmlPreview, setShowXmlPreview] = useState(false)
  const [testResult, setTestResult] = useState('')
  const [installMsg, setInstallMsg] = useState('')

  // Fetch MIDI ports
  useEffect(() => {
    fetch('/api/midi/ports').then(r => r.json()).then(d => setAvailablePorts(d.ports?.map((p: any) => p.name) || [])).catch(() => {})
  }, [setAvailablePorts])

  // Fetch plugins
  useEffect(() => {
    fetch('/api/plugins').then(r => r.json()).then(d => setPlugins(d.map((p: any) => p.name))).catch(() => {})
  }, [setPlugins])

  // Fetch presets when plugin selected
  useEffect(() => {
    if (!selectedPlugin) { setPresets([]); return }
    setLoading(true)
    fetch(`/api/presets?plugin=${encodeURIComponent(selectedPlugin)}`).then(r => r.json()).then(d => {
      setPresets(d)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [selectedPlugin, setPresets, setLoading])

  // Filtered presets
  const filteredPresets = presets.filter(p => {
    if (sourceFilter && sourceFilter !== 'All Sources' && p.source !== sourceFilter) return false
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const handleAutoMapInstall = async () => {
    const mappings = getMappings()
    if (!mappings.length) return
    try {
      const res = await fetch('/api/midi/automap', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plugin_name: selectedPlugin, preset_names: mappings.map(m => m.name), start_pc: 0 })
      })
      const data = await res.json()
      setGeneratedXml(data.xml_content, '')
      const installRes = await fetch('/api/midi/install', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plugin_name: selectedPlugin, xml_content: data.xml_content, filename: data.filename })
      })
      const installData = await installRes.json()
      setInstalledPath(installData.installed_path || '')
      setInstallMsg(installData.success ? 'Installed!' : 'Install failed')
      setShowXmlPreview(true)
    } catch (e) { console.error(e) }
  }

  const handleTestMidi = async (pc: number) => {
    try {
      await fetch('/api/midi/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port_name: midiPort, program: pc, channel: 0 })
      })
      setTestResult(`Sent PC ${pc}`)
    } catch { setTestResult('Failed') }
  }

  const handleGenerateXml = () => {
    const mappings = getMappings()
    if (!mappings.length) return
    fetch('/api/midi/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plugin_name: selectedPlugin, mappings: mappings.map(m => ({ pc: m.pc, name: m.name, uid: m.uid })) })
    }).then(r => r.json()).then(d => {
      setGeneratedXml(d.xml_content, '')
      setShowXmlPreview(true)
    })
  }

  const sources = ['All Sources', ...new Set(presets.map(p => p.source || 'User'))]

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <header className="flex items-center gap-4 px-6 py-3 border-b border-zinc-800 shrink-0">
        <Link href="/" className="text-zinc-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-lg font-semibold">Tone Presets</h1>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL — Preset selection */}
        <div className="w-1/2 border-r border-zinc-800 flex flex-col overflow-hidden">
          <div className="p-4 space-y-3 border-b border-zinc-800 shrink-0">
            <select value={selectedPlugin} onChange={e => { setSelectedPlugin(e.target.value); useMapperStore.getState().deselectAllPresets() }}
              className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 border border-zinc-700 text-sm">
              <option value="">Select plugin...</option>
              {plugins.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <div className="flex gap-2">
              <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
                className="flex-1 bg-zinc-800 text-white rounded-lg px-3 py-2 border border-zinc-700 text-sm">
                {sources.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-zinc-500" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-800 text-white rounded-lg pl-8 pr-3 py-2 border border-zinc-700 text-sm" placeholder="Search..." />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => selectAllPresets(filteredPresets.map(p => p.name))}
                className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs">All</button>
              <button onClick={() => deselectAllPresets(filteredPresets.map(p => p.name))}
                className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs">None</button>
              <span className="text-xs text-zinc-500 self-center ml-auto">{selectedPresets.size} selected</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? <p className="text-zinc-500 p-4">Loading...</p> :
              filteredPresets.length === 0 ? <p className="text-zinc-500 p-4">No presets found</p> :
              filteredPresets.map(p => (
                <label key={p.name} className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer hover:bg-zinc-800/50 text-sm ${selectedPresets.has(p.name) ? 'bg-green-500/10' : ''}`}>
                  <input type="checkbox" checked={selectedPresets.has(p.name)} onChange={() => togglePreset(p.name)} className="accent-green-500" />
                  <span className="flex-1 text-zinc-200 truncate">{p.name}</span>
                  <span className="text-xs text-zinc-600">{p.source}</span>
                </label>
              ))
            }
          </div>
        </div>

        {/* RIGHT PANEL — Selected presets + actions */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-zinc-800 shrink-0">
            <h3 className="text-sm font-medium text-zinc-300">Selected Presets (drag to reorder)</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {presetOrder.length === 0 ? (
              <p className="text-zinc-600 text-sm p-4">Select presets from the left panel</p>
            ) : (
              presetOrder.map((name, idx) => (
                <div key={name} className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800/50 hover:bg-zinc-800/30 text-sm">
                  <GripVertical className="w-3.5 h-3.5 text-zinc-600 cursor-grab" />
                  <span className="w-6 text-xs text-zinc-500 font-mono">#{idx}</span>
                  <span className="flex-1 text-zinc-200 truncate">{name}</span>
                  <button onClick={() => handleTestMidi(idx)} className="p-1 text-zinc-500 hover:text-green-400" title="Test PC"><Play className="w-3 h-3" /></button>
                  <button onClick={() => { const s = useMapperStore.getState(); s.togglePreset(name) }}
                    className="p-1 text-zinc-500 hover:text-red-400"><X className="w-3 h-3" /></button>
                </div>
              ))
            )}
          </div>
          <div className="p-4 border-t border-zinc-800 space-y-2 shrink-0">
            <div className="flex gap-2">
              <button onClick={handleAutoMapInstall} disabled={presetOrder.length === 0}
                className="flex-1 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 text-white text-sm font-medium">Auto Map &amp; Install</button>
            </div>
            <div className="flex gap-2">
              <button onClick={handleGenerateXml} disabled={presetOrder.length === 0}
                className="flex-1 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs">Generate XML</button>
              <button onClick={() => handleTestMidi(0)} className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs">Test MIDI</button>
              <Link href="/guide" className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs">Learn Guide</Link>
            </div>
            {installMsg && <p className="text-xs text-green-400">{installMsg}</p>}
            {testResult && <p className="text-xs text-zinc-500">{testResult}</p>}
            {showXmlPreview && generatedXml && (
              <div className="mt-2">
                <button onClick={() => setShowXmlPreview(!showXmlPreview)} className="text-xs text-zinc-400 hover:text-white">XML Preview {showXmlPreview ? '▲' : '▼'}</button>
                <pre className="mt-1 p-2 bg-zinc-800 rounded text-xs text-zinc-400 max-h-40 overflow-auto">{generatedXml}</pre>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
