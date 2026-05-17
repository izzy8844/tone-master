'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useMapperStore } from '@/stores/mapperStore'

export default function SettingsPage() {
  const { midiPort, availablePorts, setMidiPort, setAvailablePorts } = useMapperStore()
  const [plugins, setPlugins] = useState<Array<{ name: string; path: string; preset_count: number; has_mapping: boolean }>>([])
  const [selectedPlugin, setSelectedPlugin] = useState('')
  const [presets, setPresets] = useState<Array<{ name: string; uid?: string; path?: string; source: string }>>([])
  const [showManualCreate, setShowManualCreate] = useState(false)

  // Fetch MIDI ports
  useEffect(() => {
    fetch('/api/midi/ports')
      .then(r => r.json())
      .then(data => setAvailablePorts(data.ports?.map((p: { name: string }) => p.name) || []))
      .catch(() => {})
  }, [setAvailablePorts])

  // Fetch plugins
  useEffect(() => {
    fetch('/api/plugins')
      .then(r => r.json())
      .then(data => setPlugins(data))
      .catch(() => {})
  }, [])

  // Fetch presets when plugin selected
  useEffect(() => {
    if (selectedPlugin) {
      fetch(`/api/presets?plugin=${encodeURIComponent(selectedPlugin)}`)
        .then(r => r.json())
        .then(data => setPresets(data))
        .catch(() => {})
    }
  }, [selectedPlugin])

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="flex items-center gap-4 px-6 py-4 border-b border-zinc-800">
        <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-semibold">Settings</h1>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        {/* MIDI Configuration */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-200 mb-4">MIDI Output</h2>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <label className="text-sm text-zinc-400 mb-2 block">Output Port</label>
            <select
              value={midiPort || ''}
              onChange={(e) => {
                const port = e.target.value
                setMidiPort(port || null)
                if (port) {
                  const portIndex = availablePorts.indexOf(port)
                  if (portIndex >= 0) {
                    fetch(`/api/midi/connect?port_index=${portIndex}`, { method: 'POST' }).catch(() => {})
                  }
                }
              }}
              className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 border border-zinc-700"
            >
              <option value="">Select MIDI Port...</option>
              {availablePorts.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Tone Presets — Universal */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-200 mb-4">Tone Presets</h2>
          <p className="text-sm text-zinc-400 mb-4">
            ToneMaster works with any MIDI-capable device or plugin.
            You can auto-scan Neural DSP plugins or manually create preset mappings for any gear.
          </p>

          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 space-y-4">
            {/* Auto-detected (Neural DSP) */}
            <div>
              <h3 className="text-sm font-medium text-zinc-300 mb-2">Auto-detected (Neural DSP)</h3>
              {plugins.length === 0 ? (
                <p className="text-xs text-zinc-500">
                  No Neural DSP plugins detected. You can still create manual preset mappings below.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {plugins.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => setSelectedPlugin(p.name)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        selectedPlugin === p.name
                          ? 'border-green-500 bg-green-500/10'
                          : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      <div className="text-white font-medium">{p.name}</div>
                      <div className="text-xs text-zinc-400">{p.preset_count} presets</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Manual Preset Mapping */}
            <div className="border-t border-zinc-800 pt-4">
              <h3 className="text-sm font-medium text-zinc-300 mb-2">Manual Preset Mapping</h3>
              <p className="text-xs text-zinc-500 mb-3">
                For Line 6, Fractal, Kemper, Boss, or any other MIDI device — create a custom mapping manually.
              </p>
              <button
                onClick={() => setShowManualCreate(!showManualCreate)}
                className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-zinc-600 text-sm text-zinc-200 transition-colors"
              >
                + Create Manual Mapping
              </button>

              {showManualCreate && (
                <div className="mt-4 p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                  <h4 className="text-sm font-medium text-white mb-3">Manual Tone Mapping</h4>
                  <ManualPresetForm />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Preset List (when Neural DSP plugin selected) */}
        {selectedPlugin && presets.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-zinc-200 mb-4">
              Presets — {selectedPlugin}
            </h2>
            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 max-h-96 overflow-y-auto">
              {presets.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                  <span className="text-zinc-200">{p.name}</span>
                  <span className="text-xs text-zinc-500">{p.source}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function ManualPresetForm() {
  const [entries, setEntries] = useState<Array<{ pc: number; name: string }>>([{ pc: 0, name: '' }])

  const addEntry = () => {
    const lastPC = entries[entries.length - 1]?.pc ?? -1
    if (lastPC < 127) {
      setEntries([...entries, { pc: lastPC + 1, name: '' }])
    }
  }

  const updateEntry = (idx: number, field: 'pc' | 'name', value: string) => {
    setEntries(prev => prev.map((e, i) =>
      i === idx ? { ...e, [field]: field === 'pc' ? parseInt(value) || 0 : value } : e
    ))
  }

  const removeEntry = (idx: number) => {
    setEntries(prev => prev.filter((_, i) => i !== idx))
  }

  const handleGenerate = async () => {
    const valid = entries.filter(e => e.name.trim())
    if (!valid.length) return
    try {
      const res = await fetch('/api/midi/automap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plugin_name: 'Custom Device',
          preset_names: valid.map(e => e.name.trim()),
          start_pc: valid[0].pc,
        })
      })
      const data = await res.json()
      if (data.xml_content && data.filename) {
        await fetch('/api/midi/install', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plugin_name: 'Custom Device',
            xml_content: data.xml_content,
            filename: data.filename,
          })
        })
        alert('Mapping created and installed!')
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {entries.map((e, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={127}
              value={e.pc}
              onChange={(ev) => updateEntry(i, 'pc', ev.target.value)}
              className="w-16 bg-zinc-700 text-white rounded px-2 py-1 text-sm border border-zinc-600"
              placeholder="PC"
            />
            <input
              type="text"
              value={e.name}
              onChange={(ev) => updateEntry(i, 'name', ev.target.value)}
              className="flex-1 bg-zinc-700 text-white rounded px-2 py-1 text-sm border border-zinc-600"
              placeholder="Preset name"
            />
            <button onClick={() => removeEntry(i)} className="text-zinc-500 hover:text-red-400 text-sm">✕</button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={addEntry} className="px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-sm text-zinc-200">+ Add</button>
        <button onClick={handleGenerate} className="px-3 py-1.5 rounded bg-green-600 hover:bg-green-500 text-sm text-white">Generate & Install</button>
      </div>
    </div>
  )
}
