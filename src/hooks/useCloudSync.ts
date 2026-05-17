'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useMapperStore } from '@/stores/mapperStore'
import type { Trigger } from '@/lib/types'
import type { TriggerRow, PlaybackSettingsRow } from '@/lib/supabase/database.types'

type SyncStatus = 'idle' | 'syncing' | 'error'

// ----- Serialization -----

function triggersToDb(triggers: Trigger[]): TriggerRow[] {
  return triggers.map((t) => ({
    id: t.id,
    time: t.time,
    tone_name: t.toneName,
    program: t.program,
    bank: t.bank,
    color: t.color,
  }))
}

function triggersFromDb(rows: TriggerRow[]): Trigger[] {
  return rows.map((r) => ({
    id: r.id,
    time: r.time,
    toneName: r.tone_name,
    program: r.program,
    bank: r.bank,
    color: r.color,
  }))
}

function playbackToDb(): PlaybackSettingsRow {
  const s = useMapperStore.getState()
  return {
    zoom: 1,
    current_tick: s.positionMs / 1000,
    loop_a: s.currentProject?.abLoop?.startMs ?? null,
    loop_b: s.currentProject?.abLoop?.endMs ?? null,
    midi_port: s.midiPort ?? null,
  }
}

function playbackFromDb(row: PlaybackSettingsRow) {
  const s = useMapperStore.getState()
  if (row.current_tick) s.setPositionMs(row.current_tick * 1000)
  s.setMidiPort(row.midi_port ?? null)
}

// ----- Hook -----

export function useCloudSync() {
  const isSignedIn = useAuthStore((s) => s.isSignedIn)
  const isLoaded = useAuthStore((s) => s.isLoaded)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')

  const cloudProjectIdRef = useRef<string | undefined>(undefined)
  const syncStatusRef = useRef<SyncStatus>('idle')
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveToCloud = useCallback(async () => {
    if (!isSignedIn) return
    syncStatusRef.current = 'syncing'
    setSyncStatus('syncing')

    try {
      const cp = useMapperStore.getState().currentProject
      const payload: Record<string, unknown> = {
        name: cp?.name ?? 'Untitled',
        triggers: triggersToDb(cp?.triggers ?? []),
        audio_path: useMapperStore.getState().audioFile,
        audio_duration_sec: useMapperStore.getState().durationMs / 1000,
        playback_settings: playbackToDb(),
        is_demo: false,
      }
      if (cloudProjectIdRef.current) {
        payload.id = cloudProjectIdRef.current
      }

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const data = await res.json()
        cloudProjectIdRef.current = data.project?.id
        syncStatusRef.current = 'idle'
        setSyncStatus('idle')
      }
    } catch {
      syncStatusRef.current = 'error'
      setSyncStatus('error')
    }
  }, [isSignedIn])

  const loadFromCloud = useCallback(async () => {
    if (!isSignedIn) return
    syncStatusRef.current = 'syncing'
    setSyncStatus('syncing')

    try {
      const res = await fetch('/api/projects')
      if (!res.ok) throw new Error('Failed to fetch')

      const data = await res.json()
      const projects: Record<string, unknown>[] = data.projects ?? []
      if (projects.length === 0) {
        syncStatusRef.current = 'idle'
        setSyncStatus('idle')
        return
      }

      const p = projects[0]
      cloudProjectIdRef.current = p.id as string

      useMapperStore.getState().setCurrentProject({
        id: p.id as string,
        name: (p.name as string) ?? 'Untitled Project',
        audioFile: p.audio_path as string | undefined,
        triggers: triggersFromDb(p.triggers as TriggerRow[]),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      if (p.playback_settings) {
        playbackFromDb(p.playback_settings as PlaybackSettingsRow)
      }

      syncStatusRef.current = 'idle'
      setSyncStatus('idle')
    } catch {
      syncStatusRef.current = 'error'
      setSyncStatus('error')
    }
  }, [isSignedIn])

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      loadFromCloud()
    }
  }, [isLoaded, isSignedIn, loadFromCloud])

  // Debounced auto-push
  useEffect(() => {
    if (!isSignedIn) return

    const unsub = useMapperStore.subscribe(() => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = setTimeout(saveToCloud, 2000)
    })

    return () => {
      unsub()
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [isSignedIn, saveToCloud])

  return { saveToCloud, loadFromCloud, syncStatus }
}
