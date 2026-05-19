'use client'
import { useEffect, useRef, useCallback } from 'react'
import { usePlaybackStore } from '@/stores/playbackStore'
import { useProjectStore } from '@/stores/projectStore'
import { useMapperStore } from '@/stores/mapperStore'
import { flushWsQueue, isSeekLocked } from '@/lib/ws'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8765/ws'
const MAX_RECONNECT_ATTEMPTS = 5
const BASE_DELAY = 1000
const HEARTBEAT_INTERVAL = 30000 // 30s ping to detect stale connections

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const mountedRef = useRef(true)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptsRef = useRef(0)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const connect = useCallback(() => {
    if (!mountedRef.current) return
    if (typeof window === 'undefined') return
    // Skip WS in production if URL points to localhost
    if (WS_URL.includes('localhost') && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
      usePlaybackStore.getState().setWsStatus('disconnected')
      return
    }
    usePlaybackStore.getState().setWsStatus('connecting')
    try {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) return
        attemptsRef.current = 0 // Reset on successful connection
        usePlaybackStore.getState().setWsConnected(true)
        usePlaybackStore.getState().setWsStatus('connected')
        if (typeof window !== 'undefined') window._tm_ws = ws

        // Auto-discover MIDI ports on connect
        ws.send(JSON.stringify({ type: 'get_midi_ports' }))
        // Request current playback state
        ws.send(JSON.stringify({ type: 'get_state' }))

        // Re-sync frontend state to backend after reconnect
        const proj = useProjectStore.getState()
        const pb = usePlaybackStore.getState()
        if (proj.audioFile && proj.audioFile.includes('/')) {
          ws.send(JSON.stringify({ type: 'load_audio', path: proj.audioFile }))
        }
        if (pb.currentMidiPort) {
          ws.send(JSON.stringify({ type: 'select_midi_port', port_name: pb.currentMidiPort }))
        }
        if (pb.abLoopEnabled && pb.loopA !== null && pb.loopB !== null) {
          ws.send(JSON.stringify({
            type: 'set_loop', enabled: true,
            start_ms: Math.round(Math.min(pb.loopA, pb.loopB) * 1000),
            end_ms: Math.round(Math.max(pb.loopA, pb.loopB) * 1000),
          }))
        }

        // Sync current triggers to backend scheduler
        const triggers = proj.triggers
        if (triggers.length > 0) {
          ws.send(JSON.stringify({
            type: 'update_triggers',
            triggers: triggers.map(t => ({
              id: t.id,
              time_ms: Math.round(t.time * 1000),
              program: t.pc,
              name: t.name,
            })),
          }))
        }

        // Flush any messages that were queued during disconnect
        flushWsQueue()

        // Start heartbeat to detect stale connections
        if (heartbeatRef.current) clearInterval(heartbeatRef.current)
        heartbeatRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ack' }))
          }
        }, HEARTBEAT_INTERVAL)
      }

      ws.onmessage = (event) => {
        if (!mountedRef.current) return
        try {
          const msg = JSON.parse(event.data)
          if (!msg || typeof msg.type !== 'string') return // Validate message shape
          const pb = usePlaybackStore.getState()
          switch (msg.type) {
            case 'playhead_tick': {
              // Suppress stale ticks during seek to prevent playhead snap-back
              if (isSeekLocked()) break
              const ms = Number(msg.playhead_ms ?? msg.tick ?? 0)
              if (!Number.isFinite(ms)) break // NaN protection
              pb.setCurrentTick(ms / 1000)
              break
            }
            case 'audio_loaded': {
              const durMs = Number(msg.duration_ms ?? msg.duration ?? 0)
              if (!Number.isFinite(durMs)) break
              pb.setDuration(durMs / 1000)
              break
            }
            case 'midi_trigger':
              pb.setLastMidiEvent(msg)
              if (typeof msg.trigger_index === 'number') pb.setActiveTriggerIndex(msg.trigger_index)
              break
            case 'playback_state':
              pb.setIsPlaying(msg.playing ?? false)
              if (typeof msg.position_ms === 'number' && Number.isFinite(msg.position_ms)) {
                pb.setCurrentTick(msg.position_ms / 1000)
              }
              if (typeof msg.duration_ms === 'number' && Number.isFinite(msg.duration_ms)) {
                pb.setDuration(msg.duration_ms / 1000)
              }
              break
            case 'midi_ports': {
              const ports: string[] = Array.isArray(msg.ports)
                ? msg.ports.filter((p: unknown) => typeof p === 'string')
                : []
              pb.setMidiPorts(ports)
              useMapperStore.getState().setMidiPorts(ports)
              // Auto-select first port if none selected
              if (ports.length > 0 && !pb.currentMidiPort) {
                pb.setCurrentMidiPort(ports[0])
              }
              break
            }
            case 'port_selected':
              if (typeof msg.port === 'string') pb.setCurrentMidiPort(msg.port)
              break
            case 'plugins': {
              const plugins: string[] = Array.isArray(msg.plugins)
                ? msg.plugins.filter((p: unknown) => typeof p === 'string')
                : []
              useMapperStore.getState().setPlugins(plugins)
              const current = useMapperStore.getState().selectedPlugin
              if (plugins.length > 0 && !current) {
                useMapperStore.getState().setSelectedPlugin(plugins[0])
              }
              break
            }
            case 'ack':
            case 'pong':
              break // Heartbeat response — no action needed
            default:
              if (process.env.NODE_ENV === 'development') {
                console.debug('[WS] Unhandled message type:', msg.type)
              }
          }
        } catch (err) {
          if (process.env.NODE_ENV === 'development') console.warn('[WS] parse error:', err)
        }
      }

      ws.onerror = () => { usePlaybackStore.getState().setWsStatus('error') }

      ws.onclose = () => {
        if (!mountedRef.current) return
        if (typeof window !== 'undefined') window._tm_ws = null
        if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null }
        usePlaybackStore.getState().setWsConnected(false)
        if (attemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          usePlaybackStore.getState().setWsStatus('disconnected')
          const delay = BASE_DELAY * Math.pow(2, attemptsRef.current)
          attemptsRef.current++
          reconnectRef.current = setTimeout(connect, delay)
        } else {
          usePlaybackStore.getState().setWsStatus('error')
        }
      }
    } catch {
      usePlaybackStore.getState().setWsStatus('error')
      if (attemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = BASE_DELAY * Math.pow(2, attemptsRef.current)
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
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
      }
      // Ensure store reflects disconnected state after teardown
      usePlaybackStore.getState().setWsConnected(false)
      usePlaybackStore.getState().setWsStatus('disconnected')
      if (typeof window !== 'undefined') window._tm_ws = null
    }
  }, [connect])

  return { send }
}
