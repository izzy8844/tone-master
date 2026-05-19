/** Incoming WebSocket message types from the Python backend */
export type WSIncomingMessage =
  | { type: 'playhead_tick'; playhead_ms?: number; tick?: number }
  | { type: 'audio_loaded'; duration_ms?: number; duration?: number }
  | { type: 'midi_trigger'; pc?: number; trigger_index?: number; name?: string }
  | { type: 'playback_state'; playing?: boolean; position_ms?: number; duration_ms?: number }
  | { type: 'midi_ports'; ports?: string[] }
  | { type: 'port_selected'; port?: string }
  | { type: 'plugins'; plugins?: string[] }

/** Outgoing WebSocket message types to the Python backend */
export type WSOutgoingMessage =
  | { type: 'playback_command'; command: 'play' | 'pause' | 'stop'; position_ms?: number }
  | { type: 'seek'; position_ms: number }
  | { type: 'load_audio'; path: string }
  | { type: 'get_midi_ports' }
  | { type: 'get_state' }
  | { type: 'select_port'; port: string }
  | { type: 'set_triggers'; triggers: unknown[] }

declare global {
  interface Window {
    _tm_ws: WebSocket | null
  }
}

export {}
