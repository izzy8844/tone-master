let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
const listeners = new Set<(msg: Record<string, unknown>) => void>();

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8765/ws";

export function connectWS(): void {
  if (typeof window === "undefined") return;
  if (ws?.readyState === WebSocket.OPEN) return;

  // Standalone mode check: skip connection if deployed without backend
  if (
    WS_URL.includes("localhost") &&
    !window.location.hostname.includes("localhost")
  ) {
    console.log("[WS] Standalone mode — skipping backend connection");
    return;
  }

  try {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log("[WS] Connected");
      reconnectAttempts = 0;
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as Record<string, unknown>;
        listeners.forEach((fn) => fn(msg));
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        reconnectTimer = setTimeout(connectWS, 3000);
      } else {
        console.log("[WS] Standalone mode — max reconnect attempts reached");
      }
    };

    ws.onerror = () => {
      ws?.close();
    };
  } catch {
    // WebSocket creation failed
  }
}

export function disconnectWS(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectAttempts = MAX_RECONNECT_ATTEMPTS;
  ws?.close();
  ws = null;
}

export function sendWS(msg: Record<string, unknown>): void {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

export function onWSMessage(
  fn: (msg: Record<string, unknown>) => void
): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function isBackendConnected(): boolean {
  return ws?.readyState === WebSocket.OPEN;
}
