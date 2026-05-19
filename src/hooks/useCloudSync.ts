'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useProjectStore, type ProjectTrigger, isHydrating } from '@/stores/projectStore'
import { usePlaybackStore } from '@/stores/playbackStore'
import type { TriggerRow } from '@/lib/supabase/database.types'
import { API_BASE } from '@/lib/api'

type SyncStatus = 'idle' | 'syncing' | 'error'

function triggersToDb(triggers: ProjectTrigger[]): TriggerRow[] {
  return triggers.map((t) => ({ id: String(t.id), time: t.time, tone_name: t.name, program: t.pc, bank: undefined, color: t.color }))
}

export function useCloudSync() {
  const isSignedIn = useAuthStore((s) => s.isSignedIn)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const saveToCloud = useCallback(async () => {
    if (!isSignedIn) return

    // Cancel any in-flight save
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setSyncStatus('syncing')
    try {
      const proj = useProjectStore.getState()
      const pb = usePlaybackStore.getState()

      // Include project ID if available (upsert vs. create)
      const payload = {
        ...(proj.currentProject?.id && { id: proj.currentProject.id }),
        name: proj.projectName,
        triggers: triggersToDb(proj.triggers),
        audio_path: proj.audioFile ?? null,
        audio_duration_sec: pb.duration,
        playback_settings: { midi_port: pb.currentMidiPort },
        is_demo: proj.isDemo ?? false,
        updated_at: new Date().toISOString(),
      }
      const res = await fetch(`${API_BASE}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      if (!res.ok) {
        // If session expired, clear sync status silently (don't retry with bad auth)
        if (res.status === 401) {
          setSyncStatus('idle')
          return
        }
        throw new Error(`Sync failed: ${res.status}`)
      }
      setSyncStatus('idle')
    } catch (e) {
      // Don't set error state for aborted requests
      if (e instanceof DOMException && e.name === 'AbortError') return
      setSyncStatus('error')
    }
  }, [isSignedIn])

  useEffect(() => {
    if (!isSignedIn) return
    // Only trigger auto-save when project-relevant fields change
    let prev = {
      triggers: useProjectStore.getState().triggers,
      projectName: useProjectStore.getState().projectName,
      audioFile: useProjectStore.getState().audioFile,
    }
    const unsub = useProjectStore.subscribe((s) => {
      // Skip auto-save during hydration to prevent overwriting cloud with stale local data
      if (isHydrating) return
      const curr = { triggers: s.triggers, projectName: s.projectName, audioFile: s.audioFile }
      if (curr.triggers === prev.triggers && curr.projectName === prev.projectName && curr.audioFile === prev.audioFile) return
      prev = curr
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
      autoSaveRef.current = setTimeout(saveToCloud, 2000)
    })
    return () => {
      unsub()
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [isSignedIn, saveToCloud])

  return { saveToCloud, syncStatus }
}
