export interface TriggerRow {
  id: string;
  time: number;
  tone_name: string;
  program: number;
  bank?: number;
  color?: string;
}

export interface PlaybackSettingsRow {
  zoom: number;
  current_tick: number;
  loop_a: number | null;
  loop_b: number | null;
  midi_port: string | null;
}

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          triggers: TriggerRow[];
          audio_path: string | null;
          audio_duration_sec: number;
          playback_settings: PlaybackSettingsRow;
          is_demo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          triggers?: TriggerRow[];
          audio_path?: string | null;
          audio_duration_sec?: number;
          playback_settings?: PlaybackSettingsRow;
          is_demo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          triggers?: TriggerRow[];
          audio_path?: string | null;
          audio_duration_sec?: number;
          playback_settings?: PlaybackSettingsRow;
          is_demo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_profiles: {
        Row: {
          id: string;
          clerk_user_id: string;
          tier: "free" | "pro";
          created_at: string;
        };
        Insert: {
          id?: string;
          clerk_user_id: string;
          tier?: "free" | "pro";
          created_at?: string;
        };
        Update: {
          id?: string;
          clerk_user_id?: string;
          tier?: "free" | "pro";
          created_at?: string;
        };
        Relationships: [];
      };
    };
  };
}
