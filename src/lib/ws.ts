export function getWs(): WebSocket | null {
  if (typeof window === "undefined") return null
  return window._tm_ws ?? null
}

export function wsSend(data: Record<string, unknown>): boolean {
  const ws = getWs()
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data))
    return true
  }
  return false
}
