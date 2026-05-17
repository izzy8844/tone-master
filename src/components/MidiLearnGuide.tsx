'use client'

import { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'

const STEPS = [
  {
    title: 'Install Neural DSP Plugin',
    description: 'Download and install your Neural DSP plugin (Archetype, Quad Cortex, etc.) from neuraldsp.com. Ensure the standalone app runs correctly first.'
  },
  {
    title: 'Create Virtual MIDI Port',
    description: 'macOS: Use Audio MIDI Setup → IAC Driver. Windows: Use loopMIDI or MIDI-OX to create a virtual port named "ToneMaster".'
  },
  {
    title: 'Configure Plugin MIDI Input',
    description: 'Open your Neural DSP plugin standalone or in DAW. Set MIDI input to the virtual port you created (e.g., "ToneMaster" or "IAC Driver").'
  },
  {
    title: 'Connect in ToneMaster',
    description: 'Go to Settings → MIDI Output → Select the virtual MIDI port that your plugin is listening on.'
  },
  {
    title: 'Create a Mapping File',
    description: 'In Settings → Plugins → Select your plugin → Click "Auto Map" to generate a mapping XML, or manually assign PC numbers.'
  },
  {
    title: 'Add Triggers to Timeline',
    description: 'Load an audio file, then click "+" to add tone triggers at specific timestamps. Each trigger sends the assigned Program Change.'
  },
  {
    title: 'Test & Play',
    description: 'Press Play and watch your Neural DSP preset change automatically at each trigger point!'
  }
]

export function MidiLearnGuide() {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        title="MIDI Setup Guide"
      >
        <HelpCircle className="w-4 h-4" />
        <span>Setup Guide</span>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 bg-[#18181b] rounded-2xl border border-zinc-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white">MIDI Setup Guide</h2>
          <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          {STEPS.map((step, i) => (
            <div key={i} className="flex gap-4 mb-6 last:mb-0">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-green-900/40 text-green-400 flex items-center justify-center text-sm font-semibold">
                {i + 1}
              </div>
              <div>
                <h3 className="text-sm font-medium text-white mb-1">{step.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 flex justify-end">
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  )
}
