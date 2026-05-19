/**
 * Shared WebSocket helper — safe for SSR.
 * All components that need to send WS messages should use getWs() or wsSend().
 */

// Message queue for commands sent while WS is disconnected
const pendingQueue: Record<string, unknown>[] = []

export function getWs(): WebSocket | null {
  if (typeof window === 'undefined') return null
  return window._tm_ws ?? null
}

/**
 * Send a message via the shared WebSocket.
 * If the socket is not open, queues the message for delivery on reconnect.
 * Returns true if the message was sent immediately, false if queued.
 */
export function wsSend(data: Record<string, unknown>): boolean {
  const ws = getWs()
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data))
    return true
  }
  // Queue critical messages for later delivery (skip ephemeral commands like seek during disconnect)
  const queuableTypes = ['load_audio', 'set_loop', 'select_midi_port', 'update_triggers', 'playback_command']
  if (queuableTypes.includes(data.type as string)) {
    // Deduplicate: replace existing queued message of same type (keep latest)
    const existingIdx = pendingQueue.findIndex(m => m.type === data.type)
    if (existingIdx !== -1) {
      pendingQueue[existingIdx] = data
    } else {
      pendingQueue.push(data)
    }
  }
  return false
}

/**
 * Flush queued messages after WS reconnection.
 * Called internally by useWebSocket onopen handler.
 */
export function flushWsQueue(): void {
  const ws = getWs()
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  while (pendingQueue.length > 0) {
    const msg = pendingQueue.shift()!
    ws.send(JSON.stringify(msg))
  }
}

// Seek lock: suppress stale playhead ticks from backend after a local seek
let seekLocked = false
let seekLockTimer: ReturnType<typeof setTimeout> | null = null

export function activateSeekLock(): void {
  seekLocked = true
  if (seekLockTimer) clearTimeout(seekLockTimer)
  seekLockTimer = setTimeout(() => { seekLocked = false }, 150)
}

export function isSeekLocked(): boolean {
  return seekLocked
}
