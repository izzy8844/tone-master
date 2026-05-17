'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, AlertTriangle, CheckCircle2, Wifi, Play } from 'lucide-react'
import { useMapperStore } from '@/stores/mapperStore'
import { isMidiSupported, initMidi, getOutputPorts, selectPort, sendProgramChange, onPortChange, detectOS, type MidiPortInfo } from '@/lib/midi'

type SetupStep = 'checking' | 'no-support' | 'no-ports' | 'select-port' | 'ready'

export default function MidiSetup() {
  const midiPort = useMapperStore((s) => s.midiPort)
  const setMidiPort = useMapperStore((s) => s.setMidiPort)
  const [step, setStep] = useState<SetupStep>('checking')
  const [ports, setPorts] = useState<MidiPortInfo[]>([])
  const [os, setOs] = useState<string>('unknown')
  const [testResult, setTestResult] = useState<string | null>(null)

  const refreshPorts = useCallback(async () => {
    if (!isMidiSupported()) { setStep('no-support'); return }
    const ok = await initMidi(); if (!ok) { setStep('no-support'); return }
    const portList = getOutputPorts(); setPorts(portList)
    if (midiPort) { const found = portList.find(p => p.id === midiPort); if (found) { selectPort(midiPort); setStep('ready'); return } }
    setStep(portList.length === 0 ? 'no-ports' : 'select-port')
  }, [midiPort])

  useEffect(() => { setOs(detectOS()); refreshPorts(); const u = onPortChange(() => refreshPorts()); return () => u() }, [refreshPorts])

  return (
    <div className="rounded-lg border border-zinc-700 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {step === 'ready' ? <><CheckCircle2 className="w-5 h-5 text-green-400" /><span className="text-sm font-semibold text-green-400">MIDI Connected</span></> : <><Wifi className="w-5 h-5 text-zinc-400" /><span className="text-sm font-semibold text-zinc-300">Select Output</span></>}
        </div>
        <button onClick={refreshPorts} className="text-zinc-500 hover:text-zinc-300"><RefreshCw className="w-4 h-4" /></button>
      </div>
      {step === 'no-ports' && <div className="text-xs text-zinc-400">No MIDI ports found. Use loopMIDI (Windows) or IAC Driver (macOS).</div>}
      <div className="space-y-1.5">{ports.map(p => <button key={p.id} onClick={() => { selectPort(p.id); setMidiPort(p.id); setStep('ready'); setTestResult(null) }} className={`w-full text-left px-3 py-2 rounded-lg text-sm ${midiPort === p.id ? 'bg-green-500/20 border border-green-500/50 text-green-300' : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:border-zinc-600'}`}><div className="font-medium truncate">{p.name}</div></button>)}</div>
      {step === 'ready' && <button onClick={() => { const r = sendProgramChange(1); setTestResult(r ? 'Sent PC 1' : 'Failed') }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:border-green-500 text-xs"><Play className="w-3.5 h-3.5" />Send Test Note</button>}
      {testResult && <p className="text-xs text-zinc-500">{testResult}</p>}
    </div>
  )
}
