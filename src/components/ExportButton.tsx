'use client'

import { Download } from 'lucide-react'
import { useMapperStore } from '@/stores/mapperStore'
import { useGatekeeper } from '@/hooks/useGatekeeper'
import { downloadMidiFile, type MidiTrigger, type MidiMetadata } from '@/lib/midi-export'
import { toast } from '@/components/Toast'

export default function ExportButton() {
  const currentProject = useMapperStore((s) => s.currentProject)
  const triggers = currentProject?.triggers ?? []
  const projectName = currentProject?.name ?? 'Untitled'
  const durationMs = useMapperStore((s) => s.durationMs)
  const audioDurationSec = durationMs / 1000
  const { guard } = useGatekeeper()

  const handleExport = () => {
    guard('export_xml', () => {
      try {
        if (triggers.length === 0) {
          toast.info('Add at least one trigger before exporting.')
          return
        }

        const midiTriggers: MidiTrigger[] = triggers.map((t) => ({
          id: t.id,
          time: t.time,
          toneName: t.toneName,
          program: t.program,
          bank: t.bankMsb,
        }))

        const metadata: MidiMetadata = {
          name: projectName,
          duration: audioDurationSec,
        }

        downloadMidiFile(midiTriggers, metadata)
        toast.success('MIDI file exported!')
      } catch {
        toast.error('Failed to export MIDI file.')
      }
    })
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:border-green-500 hover:text-green-400 text-xs transition-colors"
    >
      <Download className="w-3.5 h-3.5" />
      Export MIDI
    </button>
  )
}
