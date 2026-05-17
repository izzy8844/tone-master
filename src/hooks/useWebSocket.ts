import { useEffect, useRef, useCallback } from 'react'
import { usePlaybackStore } from '@/stores/playbackStore'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8765/ws'
const RECONNECT_DELAY = 3000

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const mountedRef = useRef(true)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    if (!mountedRef.current) return
    usePlaybackStore.getState().setWsStatus('connecting')
    try {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) return
        usePlaybackStore.getState().setWsConnected(true)
        usePlaybackStore.getState().setWsStatus('connected')
      }

      ws.onmessage = (event) => {
        if (!mountedRef.current) return
        try {
          const msg = JSON.parse(event.data)
          const pb = usePlaybackStore.getState()
          switch (msg.type) {
            case 'playhead_tick': {
              const ms = msg.playhead_ms ?? msg.tick ?? 0
              pb.setCurrentTick(ms / 1000)
              break
            }
            case 'audio_loaded': {
              const dMs = msg.duration_ms ?? msg.duration ?? 0
              pb.setDuration(dMs / 1000)
              break
            }
            case 'midi_trigger':
              pb.setLastMidiEvent(msg)
              if (msg.trigger_index !== undefined) pb.setActiveTriggerIndex(msg.trigger_index)
              break
            case 'playback_state':
              pb.setIsPlaying(msg.playing ?? false)
              break
          }
        } catch {}
      }

      ws.onerror = () => { usePlaybackStore.getState().setWsStatus('error') }

      ws.onclose = () => {
        if (!mountedRef.current) return
        usePlaybackStore.getState().setWsConnected(false)
        usePlaybackStore.getState().setWsStatus('disconnected')
        reconnectRef.current = setTimeout(connect, RECONNECT_DELAY)
      }
    } catch {
      usePlaybackStore.getState().setWsStatus('error')
      reconnectRef.current = setTimeout(connect, RECONNECT_DELAY)
    }
  }, [])

  const send = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(data))
  }, [])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close() }
    }
  }, [connect])

  return { send }
}
