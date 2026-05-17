'use client'

import { useEffect, useRef } from 'react'
import { useMapperStore } from '@/stores/mapperStore'
import { sendProgramChange, getCurrentPortId } from '@/lib/midi'

export function useMidiTrigger() {
  const isPlaying = useMapperStore((s) => s.isPlaying)
  const positionMs = useMapperStore((s) => s.positionMs)
  const triggers = useMapperStore((s) => s.currentProject?.triggers ?? [])

  const lastFiredRef = useRef<string | null>(null)
  const prevPosRef = useRef<number>(0)

  // Main trigger detection
  useEffect(() => {
    if (!isPlaying) return
    if (!getCurrentPortId()) return
    if (triggers.length === 0) return

    const currentMs = positionMs
    const prevMs = prevPosRef.current

    // Forward playback: check triggers in (prevMs, currentMs]
    if (currentMs > prevMs) {
      for (const trigger of triggers) {
        const triggerMs = trigger.time * 1000
        if (triggerMs > prevMs && triggerMs <= currentMs) {
          if (trigger.id !== lastFiredRef.current) {
            sendProgramChange(trigger.program, 0)
            lastFiredRef.current = trigger.id
          }
        }
      }
    }

    prevPosRef.current = currentMs
  }, [positionMs, isPlaying, triggers])

  // Reset on stop
  useEffect(() => {
    if (!isPlaying) {
      lastFiredRef.current = null
      prevPosRef.current = positionMs
    }
  }, [isPlaying, positionMs])
}
