'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, AlertTriangle, CheckCircle2, Wifi, Play } from 'lucide-react'
import { useMapperStore } from '@/stores/mapperStore'
import {
  isMidiSupported,
  initMidi,
  getOutputPorts,
  selectPort,
  sendProgramChange,
  onPortChange,
  detectOS,
  type MidiPortInfo,
} from '@/lib/midi'

type SetupStep = 'checking' | 'no-support' | 'no-ports' | 'select-port' | 'ready'

export default function MidiSetup() {
  const midiPort = useMapperStore((s) => s.midiPort)
  const setMidiPort = useMapperStore((s) => s.setMidiPort)
  const [step, setStep] = useState<SetupStep>('checking')
  const [ports, setPorts] = useState<MidiPortInfo[]>([])
  const [os, setOs] = useState<string>('unknown')
  const [testResult, setTestResult] = useState<string | null>(null)

  const refreshPorts = useCallback(async () => {
    if (!isMidiSupported()) {
      setStep('no-support')
      return
    }
    const ok = await initMidi()
    if (!ok) {
      setStep('no-support')
      return
    }
    const portList = getOutputPorts()
    setPorts(portList)
    // Auto-connect to saved port
    if (midiPort) {
      const found = portList.find((p) => p.id === midiPort)
      if (found) {
        selectPort(midiPort)
        setStep('ready')
        return
      }
    }
    setStep(portList.length === 0 ? 'no-ports' : 'select-port')
  }, [midiPort])

  useEffect(() => {
    setOs(detectOS())
    refreshPorts()
    const unsub = onPortChange(() => refreshPorts())
    return () => unsub()
  }, [refreshPorts])

  const handleSelect = (portId: string) => {
    if (selectPort(portId)) {
      setMidiPort(portId)
      setStep('ready')
      setTestResult(null)
    }
  }

  const handleTest = () => {
    if (sendProgramChange(1)) {
      setTestResult('Sent PC 1 (Clean Chorus)')
    } else {
      setTestResult('Failed to send MIDI message')
    }
  }

  if (step === 'checking') {
    return (
      <div className="rounded-lg border border-zinc-700 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-t-transparent border-green-500 rounded-full animate-spin" />
          <span className="text-sm text-zinc-400">Detecting MIDI devices...</span>
        </div>
      </div>
    )
  }

  if (step === 'no-support') {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <span className="text-sm font-semibold text-red-400">Web MIDI Not Supported</span>
        </div>
        <p className="text-xs text-zinc-400">
          Your browser does not support the Web MIDI API. Use Chrome 43+, Edge 79+, or Opera 30+.
        </p>
      </div>
    )
  }

  if (step === 'no-ports') {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Wifi className="w-5 h-5 text-amber-400" />
          <span className="text-sm font-semibold text-amber-400">No MIDI Output Ports</span>
        </div>
        {os === 'mac' && <MacIACGuide />}
        {os === 'windows' && <WindowsLoopMidiGuide />}
        {os === 'linux' && (
          <p className="text-xs text-zinc-400">
            Use <code className="text-zinc-300 bg-zinc-800 px-1 rounded">aconnect -l</code> to list ALSA MIDI ports.
            Load <code className="text-zinc-300 bg-zinc-800 px-1 rounded">snd-virmidi</code> for virtual ports.
          </p>
        )}
        <button onClick={refreshPorts} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Devices
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-zinc-700 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {step === 'ready' ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span className="text-sm font-semibold text-green-400">MIDI Connected</span>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </>
          ) : (
            <>
              <Wifi className="w-5 h-5 text-zinc-400" />
              <span className="text-sm font-semibold text-zinc-300">Select Output</span>
            </>
          )}
        </div>
        <button onClick={refreshPorts} className="text-zinc-500 hover:text-zinc-300">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-1.5">
        {ports.map((p) => {
          const isSelected = midiPort === p.id
          return (
            <button
              key={p.id}
              onClick={() => handleSelect(p.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                isSelected
                  ? 'bg-green-500/20 border border-green-500/50 text-green-300'
                  : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              <div className="font-medium truncate">{p.name}</div>
              <div className="text-xs text-zinc-500">{p.manufacturer}</div>
            </button>
          )
        })}
      </div>
      {step === 'ready' && (
        <div className="space-y-2">
          <button
            onClick={handleTest}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:border-green-500 hover:text-green-400 text-xs transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            Send Test Note
          </button>
          {testResult && <p className="text-xs text-zinc-500">{testResult}</p>}
        </div>
      )}
    </div>
  )
}

function MacIACGuide() {
  return (
    <div className="border border-blue-500/30 bg-blue-500/5 rounded-lg p-3 space-y-2">
      <p className="text-xs font-semibold text-blue-400">macOS: Enable IAC Driver</p>
      <ol className="text-xs text-zinc-400 space-y-1 list-decimal list-inside">
        <li>Open Audio MIDI Setup (Applications &gt; Utilities)</li>
        <li>Window &gt; Show MIDI Studio</li>
        <li>Double-click IAC Driver</li>
        <li>Check &quot;Device is online&quot;</li>
        <li>Click Apply</li>
      </ol>
      <a href="https://support.apple.com/guide/audio-midi-setup/transfer-midi-information-between-apps-ams1013/mac" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline inline-block">Apple Guide: IAC Driver Setup ↗</a>
    </div>
  )
}

function WindowsLoopMidiGuide() {
  return (
    <div className="border border-purple-500/30 bg-purple-500/5 rounded-lg p-3 space-y-2">
      <p className="text-xs font-semibold text-purple-400">Windows: Install loopMIDI</p>
      <ol className="text-xs text-zinc-400 space-y-1 list-decimal list-inside">
        <li>Download loopMIDI from Tobias Erichsen</li>
        <li>Run the installer</li>
        <li>Click &quot;+&quot; to create a virtual port</li>
        <li>Name it (e.g. ToneMaster)</li>
        <li>Select it in ToneMaster and your DAW</li>
      </ol>
      <a href="https://www.tobias-erichsen.de/software/loopmidi.html" target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:underline inline-block">Download loopMIDI (Free) ↗</a>
    </div>
  )
}
