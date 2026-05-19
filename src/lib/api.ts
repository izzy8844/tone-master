// Use empty string in production (requests go through Next.js rewrites in next.config.ts)
// Only use direct backend URL in development or when explicitly configured
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? '' : 'http://127.0.0.1:8765')

const DEFAULT_TIMEOUT = 15000

/**
 * Fetch with an automatic timeout via AbortController.
 * Rejects with an AbortError if the request exceeds `timeoutMs`.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      ...options,
      signal: options.signal ?? controller.signal,
    })
    return res
  } finally {
    clearTimeout(timer)
  }
}

export interface MappingFileInfo {
  filename: string
  tone_count: number
  plugin_name?: string
  path?: string
}

export interface MappingTone {
  name: string
  pc: number
  uid: string
}

export interface MidiPortRaw {
  index: number
  name: string
}

export async function fetchMidiPorts(): Promise<{ ports: MidiPortRaw[] }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/midi/ports`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchMappingFiles(plugin: string): Promise<{ files: MappingFileInfo[] }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/midi/mappings?plugin=${encodeURIComponent(plugin)}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  // Backend returns array directly, wrap for consistency
  const data = await res.json()
  const files = Array.isArray(data) ? data : (data.files || [])
  return { files }
}

export async function fetchMappingTones(plugin: string, filename: string): Promise<{ tones: MappingTone[] }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/midi/mappings/${encodeURIComponent(plugin)}/${encodeURIComponent(filename)}/tones`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  // Backend returns array directly, wrap for consistency
  const data = await res.json()
  const tones = Array.isArray(data) ? data : (data.tones || [])
  return { tones }
}

export async function testMidi(portName: string, pc: number): Promise<{ success: boolean }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/midi/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ port_name: portName, program: pc, channel: 0 }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function selectMidiPort(portName: string): Promise<{ success: boolean }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/midi/select-port`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ port: portName }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// --- Plugin & Preset APIs ---

export interface PluginInfo {
  name: string
  id?: string
}

export interface PresetInfo {
  name: string
  uid?: string
  uid_path?: string
  source?: string
  path?: string
  plugin?: string
}

export async function fetchPlugins(): Promise<PluginInfo[]> {
  const res = await fetchWithTimeout(`${API_BASE}/api/plugins`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchPresets(plugin: string, source?: string): Promise<PresetInfo[]> {
  const params = new URLSearchParams({ plugin })
  if (source && source !== 'all') params.set('source', source)
  const res = await fetchWithTimeout(`${API_BASE}/api/presets?${params}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// --- Audio APIs ---

export interface AudioFileInfo {
  filename: string
  path: string
  duration_sec?: number
}

export async function uploadAudio(file: File): Promise<{ path: string; duration_sec: number; waveform?: number[] }> {
  const formData = new FormData()
  formData.append('file', file)
  // Longer timeout for file uploads
  const res = await fetchWithTimeout(`${API_BASE}/api/audio/upload`, { method: 'POST', body: formData }, 60000)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchAudioFiles(): Promise<AudioFileInfo[]> {
  const res = await fetchWithTimeout(`${API_BASE}/api/audio/files`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchWaveform(path: string, numPeaks = 500): Promise<{ peaks: number[] }> {
  const params = new URLSearchParams({ path, num_peaks: String(numPeaks) })
  const res = await fetchWithTimeout(`${API_BASE}/api/audio/waveform?${params}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// --- Project CRUD APIs ---

export interface ProjectSummary {
  id: string
  name: string
  trigger_count: number
  updated_at: string
  is_demo?: boolean
}

export interface TriggerPoint {
  id: string
  time: number
  tone_name: string
  program: number
  color: string
  bank?: number | null
}

export interface Project {
  id: string
  name: string
  triggers: TriggerPoint[]
  audio_path?: string
  audio_duration_sec?: number
  playback_settings?: Record<string, unknown>
  is_demo?: boolean
  created_at?: string
  updated_at?: string
}

export async function fetchProjects(): Promise<{ projects: ProjectSummary[] }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/projects`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchProject(id: string): Promise<{ project: Project }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/projects/${id}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function createProject(data: Partial<Project>): Promise<{ project: Project }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function updateProject(id: string, data: Partial<Project>): Promise<{ project: Project }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE}/api/projects/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

// --- Init / Auto-Setup APIs ---

export interface AutoSetupResult {
  status: 'ready' | 'auto_mapped' | 'no_user_presets' | 'no_plugins'
  plugin: string | null
  user_presets: Array<{ name: string; pc: number; uid: string }>
  mapping_installed: boolean
  mapping_file?: string
  installed_path?: string
}

export async function initAutoSetup(): Promise<AutoSetupResult> {
  const res = await fetchWithTimeout(`${API_BASE}/api/init/auto-setup`, { method: 'POST' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  // Response format: { status, results: [{plugin, status: 'auto_mapped'|'ready'|'no_user_presets', preset_count, mapping_installed, ...}] }
  const data = await res.json()
  // Backward compatibility: wrap single-result old format into results array
  if (!data.results && data.plugin) {
    data.results = [data]
  }
  return data
}

// --- MIDI Learn APIs ---

export async function startLearnGuide(plugin: string, presetNames: string[], portName: string): Promise<{ session_id: string; instruction?: string }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/midi/learn/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plugin, preset_names: presetNames, port_name: portName }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function executeLearnStep(sessionId: string): Promise<{ name?: string; uid: string; complete?: boolean; instruction?: string }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/midi/learn/${sessionId}/execute`, { method: 'POST' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function getLearnResults(sessionId: string): Promise<{ results: Array<{ name: string; uid: string }> }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/midi/learn/${sessionId}/results`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
