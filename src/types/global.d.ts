declare global {
  interface Window {
    _tm_ws: WebSocket | null
  }
}
export {}
