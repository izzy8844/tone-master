'use client'
import { useState } from 'react'
import { X } from 'lucide-react'

interface Props {
  presets: Array<{ name: string; uid?: string }>
  plugin: string
  onClose: () => void
  onComplete: (results: Array<{ name: string; uid: string }>) => void
}

export function LearnGuideModal({ presets, plugin, onClose, onComplete }: Props) {
  const [step, setStep] = useState(0) // 0=start, 1=executing, 2=complete
  const [sessionId, setSessionId] = useState('')
  const [currentPreset, setCurrentPreset] = useState('')
  const [results, setResults] = useState<Array<{ name: string; uid: string }>>([])
  const [loading, setLoading] = useState(false)
  const uidless = presets.filter(p => !p.uid)

  const handleStart = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/midi/learn/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plugin, preset_names: uidless.map(p => p.name), port_name: '' })
      })
      const data = await res.json()
      setSessionId(data.session_id)
      setStep(1)
      setCurrentPreset(uidless[0]?.name || '')
    } catch {} finally { setLoading(false) }
  }

  const handleExecute = async () => {
    if (step < 1 || step > uidless.length) return
    setLoading(true)
    try {
      const res = await fetch(`/api/midi/learn/${sessionId}/execute`, { method: 'POST' })
      const data = await res.json()
      setResults(prev => [...prev, data])
      if (data.complete) {
        setStep(2)
      } else {
        setCurrentPreset(uidless[step]?.name || '')
      }
    } catch {} finally { setLoading(false) }
  }

  const handleComplete = () => {
    onComplete(results)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-[#18181b] rounded-2xl border border-zinc-800 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white">MIDI Learn Guide</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-6">
          {step === 0 && (
            <div className="text-center space-y-4">
              <p className="text-sm text-zinc-400">{uidless.length} presets need MIDI binding</p>
              <div className="max-h-40 overflow-y-auto text-left space-y-1">
                {uidless.map(p => <p key={p.name} className="text-sm text-zinc-300">{p.name}</p>)}
              </div>
              <button onClick={handleStart} disabled={loading}
                className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium disabled:opacity-50">
                {loading ? 'Starting...' : 'Start'}
              </button>
            </div>
          )}
          {step === 1 && (
            <div className="text-center space-y-4">
              <p className="text-sm text-zinc-400">Current preset: <span className="text-white">{currentPreset}</span></p>
              <p className="text-xs text-zinc-500">Switch to this preset in your DAW, then click Execute</p>
              <button onClick={handleExecute} disabled={loading}
                className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium disabled:opacity-50">
                {loading ? 'Executing...' : 'Execute'}
              </button>
              <div className="text-xs text-zinc-600">Step {results.length + 1} of {uidless.length}</div>
            </div>
          )}
          {step === 2 && (
            <div className="text-center space-y-4">
              <p className="text-sm text-green-400">All {results.length} presets bound!</p>
              <button onClick={handleComplete}
                className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
