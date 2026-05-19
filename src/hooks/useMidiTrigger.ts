'use client'
import { useEffect, useRef } from 'react'
import { usePlaybackStore } from '@/stores/playbackStore'
import { useProjectStore } from '@/stores/projectStore'
import { sendProgramChange, getCurrentPortId } from '@/lib/midi'

export function useMidiTrigger() {
  const isPlaying = usePlaybackStore((s) => s.isPlaying)
  const currentTick = usePlaybackStore((s) => s.currentTick)
  const triggers = useProjectStore((s) => s.triggers)
  const lastFiredRef = useRef<string | null>(null)
  const prevTickRef = useRef(0)
  const wasPlayingRef = useRef(false)

  useEffect(() => {
    if (!isPlaying) return
    if (!getCurrentPortId()) return
    if (triggers.length === 0) return
    const prevTick = prevTickRef.current
    if (currentTick < prevTick) { lastFiredRef.current = null }
    if (currentTick > prevTick) {
      for (const t of triggers) {
        if (t.time > prevTick && t.time <= currentTick) {
          if (String(t.id) !== lastFiredRef.current) { sendProgramChange(t.pc, 0); lastFiredRef.current = String(t.id) }
        }
      }
    }
    prevTickRef.current = currentTick
  }, [currentTick, isPlaying, triggers])

  useEffect(() => {
    if (isPlaying && !wasPlayingRef.current) {
      prevTickRef.current = currentTick; lastFiredRef.current = null
      if (getCurrentPortId() && triggers.length > 0) {
        for (const t of triggers) {
          if (t.time === currentTick) { sendProgramChange(t.pc, 0); lastFiredRef.current = String(t.id); break }
        }
      }
    }
    if (!isPlaying && wasPlayingRef.current) { lastFiredRef.current = null }
    wasPlayingRef.current = isPlaying
  }, [isPlaying, currentTick, triggers])
}
