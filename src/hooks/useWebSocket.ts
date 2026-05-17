import { useEffect, useRef, useCallback } from 'react'
import { usePlaybackStore } from '@/stores/playbackStore'

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

    usePlaybackStore.getState().setWsStatus('connecting')
    globalWs = new WebSocket(WS_URL)
    wsRef.current = globalWs

    globalWs.onopen = () => {
      usePlaybackStore.getState().setWsConnected(true)
      usePlaybackStore.getState().setWsStatus('connected')
    }

    globalWs.onclose = () => {
      usePlaybackStore.getState().setWsConnected(false)
      usePlaybackStore.getState().setWsStatus('disconnected')
      if (mountedRef.current) setTimeout(connect, 3000)
    }

    globalWs.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      const pb = usePlaybackStore.getState()
      switch (msg.type) {
        case 'playhead_tick':
          pb.setCurrentTick(msg.playhead_ms / 1000)
          break
        case 'audio_loaded':
          pb.setDuration((msg.duration_ms || 0) / 1000)
          break
        case 'midi_trigger':
          if (msg.trigger) {
            pb.setLastMidiEvent({ pc: msg.trigger.pc, name: msg.trigger.name || '' })
          }
          if (msg.trigger_index !== undefined) pb.setActiveTriggerIndex(msg.trigger_index)
          break
        case 'playback_state':
          pb.setIsPlaying(msg.playing)
          if (!msg.playing) pb.setActiveTriggerIndex(-1)
          break
        case 'error':
          console.error('[WS Error]', msg.message)
          break
      }
    }
  }, [])

  const send = useCallback((data: Record<string, unknown>) => {
    if (globalWs?.readyState === WebSocket.OPEN) {
      globalWs.send(JSON.stringify(data))
    }
  }, [])

  const sendCommand = useCallback((command: string, positionMs?: number) => {
    send({ type: 'playback_command', command, position_ms: positionMs })
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

  return { send, sendCommand }
}
