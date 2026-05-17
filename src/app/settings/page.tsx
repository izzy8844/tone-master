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

        {/* Neural DSP Plugins */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-200 mb-4">Neural DSP Plugins</h2>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            {plugins.length === 0 ? (
              <p className="text-zinc-500">No Neural DSP plugins detected. Install plugins to see them here.</p>
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
        </section>

        {/* Preset List */}
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
