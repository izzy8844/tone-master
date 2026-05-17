'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useProjectStore, type ProjectTrigger } from '@/stores/projectStore'
import { usePlaybackStore } from '@/stores/playbackStore'
import type { TriggerRow, PlaybackSettingsRow } from '@/lib/supabase/database.types'

type SyncStatus = 'idle' | 'syncing' | 'error'

function triggersToDb(triggers: ProjectTrigger[]): TriggerRow[] {
  return triggers.map((t) => ({ id: String(t.id), time: t.time, tone_name: t.name, program: t.pc, bank: null as any, color: t.color }))
}

type Trigger = ProjectTrigger

export function useCloudSync() {
  const isSignedIn = useAuthStore((s) => s.isSignedIn)
  const isLoaded = useAuthStore((s) => s.isLoaded)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveToCloud = useCallback(async () => {
    if (!isSignedIn) return
    setSyncStatus('syncing')
    try {
      const proj = useProjectStore.getState()
      const pb = usePlaybackStore.getState()
      const payload: Record<string, unknown> = {
        name: proj.projectName,
        triggers: triggersToDb(proj.triggers),
        audio_path: proj.audioFile,
        audio_duration_sec: pb.duration,
        playback_settings: { midi_port: pb.currentMidiPort },
        is_demo: proj.isDemo,
      }
      await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      setSyncStatus('idle')
    } catch { setSyncStatus('error') }
  }, [isSignedIn])

  useEffect(() => {
    if (!isSignedIn) return
    const unsub = useProjectStore.subscribe(() => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
      autoSaveRef.current = setTimeout(saveToCloud, 2000)
    })
    return () => { unsub(); if (autoSaveRef.current) clearTimeout(autoSaveRef.current) }
  }, [isSignedIn, saveToCloud])

  return { saveToCloud, syncStatus }
}
