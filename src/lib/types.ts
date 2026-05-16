export interface Trigger {
  id: string;
  time: number;
  toneName: string;
  program: number;
  bank?: number;
  color?: string;
}

export interface MidiPort {
  name: string;
  id: string;
}

export type Tier = "guest" | "free" | "pro";

export type GateAction = "import_audio" | "save_project" | "add_trigger" | "export_xml";

export interface GateModalPayload {
  action: GateAction;
  title: string;
  message: string;
  requiredTier: "free" | "pro";
}

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

export interface WaveformData {
  peaks: number[];
  duration_ms: number;
}

export interface WSPlaybackCommand {
  type: "playback_command";
  command: "play" | "pause" | "stop" | "seek";
  position_ms?: number;
}

export interface WSLoadAudio {
  type: "load_audio";
  path: string;
}

export interface WSPlaybackState {
  type: "playback_state";
  state: "playing" | "paused" | "stopped";
  position_ms: number;
}
