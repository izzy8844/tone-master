import { useEffect, useRef, useCallback } from 'react'
import { useMapperStore } from '@/stores/mapperStore'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8765/ws'

let globalWs: WebSocket | null = null
let refCount = 0

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    if (globalWs?.readyState === WebSocket.OPEN) {
      wsRef.current = globalWs
      return
    }

    globalWs = new WebSocket(WS_URL)
    wsRef.current = globalWs

    globalWs.onopen = () => useMapperStore.getState().setConnected(true)
    globalWs.onclose = () => {
      useMapperStore.getState().setConnected(false)
      if (mountedRef.current) setTimeout(connect, 2000)
    }

    globalWs.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      const s = useMapperStore.getState()
      switch (msg.type) {
        case 'playhead_tick':
          s.setPositionMs(msg.position_ms)
          s.setIsPlaying(msg.is_playing)
          s.setDurationMs(msg.duration_ms || s.durationMs)
          break
        case 'audio_loaded':
          s.setDurationMs(msg.duration_ms)
          s.setAudioFile(msg.path || msg.filename)
          break
        case 'midi_trigger':
          s.setActiveTriggerIndex(msg.index)
          break
        case 'playback_state':
          s.setIsPlaying(msg.is_playing)
          if (msg.position_ms !== undefined) {
            s.setPositionMs(msg.position_ms)
          } else if (msg.current_time !== undefined) {
            s.setPositionMs(msg.current_time * 1000)
          }
          if (msg.duration_ms) s.setDurationMs(msg.duration_ms)
          else if (msg.duration) s.setDurationMs(msg.duration * 1000)
          break
      }
    }
  }, [])  // empty deps = stable, uses getState() for store access

  const send = useCallback((data: Record<string, unknown>) => {
    if (globalWs?.readyState === WebSocket.OPEN) {
      globalWs.send(JSON.stringify(data))
    }
  }, [])

  const sendCommand = useCallback((command: string, positionMs?: number) => {
    send({ type: 'playback_command', command, position_ms: positionMs })
  }, [send])

  const updateTriggers = useCallback((triggers: Array<Record<string, unknown>>) => {
    send({ type: 'update_triggers', triggers })
  }, [send])

  useEffect(() => {
    mountedRef.current = true
    refCount++
    connect()
    return () => {
      mountedRef.current = false
      refCount--
      if (refCount <= 0) {
        globalWs?.close()
        globalWs = null
      }
    }
  }, [connect])

  return { send, sendCommand, updateTriggers }
}
