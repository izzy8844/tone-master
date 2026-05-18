'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useProjectStore, type ProjectTrigger } from '@/stores/projectStore'
import { usePlaybackStore } from '@/stores/playbackStore'
import type { TriggerRow, PlaybackSettingsRow } from '@/lib/supabase/database.types'
import { API_BASE } from '@/lib/api'

type SyncStatus = 'idle' | 'syncing' | 'error'

function triggersToDb(triggers: ProjectTrigger[]): TriggerRow[] {
  return triggers.map((t) => ({ id: String(t.id), time: t.time, tone_name: t.name, program: t.pc, color: t.color }))
}

export function useCloudSync() {
  const isSignedIn = useAuthStore((s) => s.isSignedIn)
  const isLoaded = useAuthStore((s) => s.isLoaded)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const saveToCloud = useCallback(async () => {
    if (!isSignedIn) return
    // Cancel previous in-flight save
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setSyncStatus('syncing')
    try {
      const proj = useProjectStore.getState()
      const pb = usePlaybackStore.getState()
      const payload = {
        id: proj.currentProject?.id,
        name: proj.projectName,
        triggers: triggersToDb(proj.triggers),
        audio_path: proj.audioFile,
        audio_duration_sec: pb.duration,
        playback_settings: { midi_port: pb.currentMidiPort },
        is_demo: proj.isDemo,
      }
      const res = await fetch(`${API_BASE}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`Save failed: ${res.status}`)
      setSyncStatus('idle')
    } catch (e: any) {
      if (e?.name === 'AbortError') return // cancelled superseded save
      setSyncStatus('error')
    }
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
