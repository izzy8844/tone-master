'use client'

import { useState } from 'react'
import { X, Loader2, CheckCircle, AlertCircle, MousePointer } from 'lucide-react'
import { API_BASE } from '@/lib/api'

interface Props {
  presets: Array<{ name: string; uid?: string; source?: string }>
  plugin: string
  portName: string
  onClose: () => void
  onComplete: (results: Array<{ name: string; uid: string }>) => void
}

export function LearnGuideModal({ presets, plugin, portName, onClose, onComplete }: Props) {
  const [step, setStep] = useState<'start' | 'learning' | 'complete'>('start')
  const [sessionId, setSessionId] = useState('')
  const [currentPresetIndex, setCurrentPresetIndex] = useState(0)
  const [results, setResults] = useState<Array<{ name: string; uid: string }>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [instruction, setInstruction] = useState('')

  const uidless = presets.filter(p => !p.uid)
  const progress = uidless.length > 0 ? (currentPresetIndex / uidless.length) * 100 : 0

  const handleStart = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/midi/learn/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plugin, preset_names: uidless.map(p => p.name), port_name: portName })
      })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data = await res.json()
      setSessionId(data.session_id)
      setStep('learning')
      setCurrentPresetIndex(0)
      if (data.instruction) setInstruction(data.instruction)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start learn session')
    } finally {
      setLoading(false)
    }
  }

  const handleExecute = async () => {
    if (step !== 'learning') return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/midi/learn/${sessionId}/execute`, { method: 'POST' })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data = await res.json()
      setResults(prev => [...prev, { name: data.name || uidless[currentPresetIndex]?.name, uid: data.uid }])
      if (data.complete || currentPresetIndex + 1 >= uidless.length) {
        setStep('complete')
      } else {
        setCurrentPresetIndex(prev => prev + 1)
        if (data.instruction) setInstruction(data.instruction)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute step')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = () => {
    onComplete(results)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-[#18181b] rounded-2xl border border-zinc-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <MousePointer className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">MIDI Learn Guide</h2>
              <p className="text-xs text-zinc-500">{uidless.length} presets to bind</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        {step === 'learning' && (
          <div className="px-6 pt-4">
            <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1.5">
              <span>Step {currentPresetIndex + 1} of {uidless.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2.5 px-4 py-3 rounded-lg bg-red-500/5 border border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-6">
          {step === 'start' && (
            <div className="space-y-4">
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-2">
                {uidless.slice(0, 8).map(p => (
                  <div key={p.name} className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900/50">
                    <span className="text-sm text-zinc-200 truncate">{p.name}</span>
                    {p.source && <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">{p.source}</span>}
                  </div>
                ))}
                {uidless.length > 8 && (
                  <p className="text-xs text-zinc-500 text-center pt-1">... and {uidless.length - 8} more</p>
                )}
              </div>
              <button onClick={handleStart} disabled={loading}
                className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Starting...' : 'Start Learn Session'}
              </button>
            </div>
          )}

          {step === 'learning' && (
            <div className="space-y-4">
              {/* Current preset card */}
              <div className="px-4 py-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center">
                <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Switch to this preset:</p>
                <p className="text-lg font-bold text-white">{uidless[currentPresetIndex]?.name}</p>
              </div>

              {/* Instruction panel */}
              {instruction && (
                <div className="px-4 py-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <p className="text-xs text-blue-300">{instruction}</p>
                </div>
              )}

              <button onClick={handleExecute} disabled={loading}
                className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Sending PC signal...' : 'Ready — Send PC Signal'}
              </button>
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <CheckCircle className="w-7 h-7 text-green-400" />
              </div>
              <div>
                <p className="text-base font-semibold text-white">All presets bound!</p>
                <p className="text-xs text-zinc-500 mt-1">{results.length} MIDI bindings learned successfully</p>
              </div>
              <button onClick={handleComplete}
                className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium text-sm transition-colors">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
