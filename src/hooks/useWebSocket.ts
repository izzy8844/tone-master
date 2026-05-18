'use client'

import { useEffect, useRef, useCallback } from 'react'
import { usePlaybackStore } from '@/stores/playbackStore'
import { useProjectStore } from '@/stores/projectStore'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8765/ws'
const MAX_RECONNECT_ATTEMPTS = 5

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const mountedRef = useRef(true)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptsRef = useRef(0)

  const connect = useCallback(() => {
    if (!mountedRef.current) return
    if (typeof window === 'undefined') return
    // Skip WS in production when URL targets localhost
    if (process.env.NODE_ENV === 'production' && WS_URL.includes('localhost')) {
      usePlaybackStore.getState().setWsStatus('connected')
      return
    }
    usePlaybackStore.getState().setWsStatus('connecting')
    try {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) return
        attemptsRef.current = 0
        usePlaybackStore.getState().setWsConnected(true)
        usePlaybackStore.getState().setWsStatus('connected')
        if (typeof window !== 'undefined') window._tm_ws = ws

        // Auto-discover MIDI ports on connect
        ws.send(JSON.stringify({ type: 'get_midi_ports' }))
        ws.send(JSON.stringify({ type: 'get_state' }))

        // Sync current triggers to backend scheduler
        const proj = useProjectStore.getState()
        const triggers = proj.triggers
        if (triggers.length > 0) {
          ws.send(JSON.stringify({
            type: 'update_triggers',
            triggers: triggers.map(t => ({
              id: String(t.id),
              time_ms: Math.round(t.time * 1000),
              program: t.pc,
              name: t.name,
            })),
          }))
        }
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
              if (msg.position_ms !== undefined) pb.setCurrentTick(msg.position_ms / 1000)
              if (msg.duration_ms !== undefined) pb.setDuration(msg.duration_ms / 1000)
              break
            case 'midi_ports':
              if (msg.ports?.length) {
                pb.setMidiPorts(msg.ports)
                if (!pb.currentMidiPort) pb.setCurrentMidiPort(msg.ports[0])
              }
              break
            case 'error':
              console.error('[WS Error]', msg.message)
              break
          }
        } catch (e) {
          if (process.env.NODE_ENV === 'development') console.warn('[WS parse]', e)
        }
      }

      ws.onerror = () => { usePlaybackStore.getState().setWsStatus('error') }

      ws.onclose = () => {
        if (!mountedRef.current) return
        if (typeof window !== 'undefined') window._tm_ws = null
        usePlaybackStore.getState().setWsConnected(false)
        usePlaybackStore.getState().setWsStatus('disconnected')
        if (attemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(1000 * Math.pow(2, attemptsRef.current), 16000)
          attemptsRef.current++
          reconnectRef.current = setTimeout(connect, delay)
        } else {
          usePlaybackStore.getState().setWsStatus('error')
        }
      }
    } catch {
      usePlaybackStore.getState().setWsStatus('error')
      if (attemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(1000 * Math.pow(2, attemptsRef.current), 16000)
        attemptsRef.current++
        reconnectRef.current = setTimeout(connect, delay)
      }
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
