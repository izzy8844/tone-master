declare global {
  interface Window {
    _tm_ws: WebSocket | null
  }
}

export type WSIncomingMessage =
  | { type: 'playback_state'; is_playing: boolean; position_ms: number; duration_ms: number }
  | { type: 'midi_trigger'; trigger_id: string; index: number; program: number; name: string; time_ms: number }
  | { type: 'trigger_fired'; trigger_id: string; name: string }
  | { type: 'midi_ports'; ports: string[] }
  | { type: 'port_selected'; port: string }
  | { type: 'plugins'; plugins: string[] }
  | { type: 'error'; message: string }

export type WSOutgoingMessage =
  | { type: 'play' | 'pause' | 'stop' }
  | { type: 'seek'; position: number }
  | { type: 'update_triggers'; triggers: Array<{ id: string; time_ms: number; program: number; name: string }> }
  | { type: 'get_midi_ports' }
  | { type: 'select_midi_port'; port: string }
  | { type: 'get_state' }
  | { type: 'get_plugins' }

export {}
