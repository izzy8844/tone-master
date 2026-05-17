import { useEffect, useRef, useCallback } from 'react'
import { useMapperStore } from '@/stores/mapperStore'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8765/ws'

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const store = useMapperStore()

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => store.setConnected(true)
    ws.onclose = () => {
      store.setConnected(false)
      // Auto-reconnect after 2s
      setTimeout(connect, 2000)
    }

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      switch (msg.type) {
        case 'playhead_tick':
          store.setPositionMs(msg.position_ms)
          store.setIsPlaying(msg.is_playing)
          break
        case 'audio_loaded':
          store.setDurationMs(msg.duration_ms)
          store.setAudioFile(msg.filename)
          break
        case 'midi_trigger':
          store.setActiveTriggerIndex(msg.index)
          break
        case 'playback_state':
          store.setIsPlaying(msg.is_playing)
          store.setPositionMs(msg.position_ms)
          break
      }
    }
  }, [store])

  const send = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  const sendCommand = useCallback((command: string, positionMs?: number) => {
    send({ type: 'playback_command', command, position_ms: positionMs })
  }, [send])

  const updateTriggers = useCallback((triggers: Array<Record<string, unknown>>) => {
    send({ type: 'update_triggers', triggers })
  }, [send])

  useEffect(() => {
    connect()
    return () => { wsRef.current?.close() }
  }, [connect])

  return { send, sendCommand, updateTriggers }
}
