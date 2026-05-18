export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8765'

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    return res
  } finally {
    clearTimeout(timeout)
  }
}

// ── Type definitions ──
export interface PluginInfo { name: string; display_name?: string; version?: string }
export interface PresetInfo { name: string; source?: string; uid?: string; plugin?: string }
export interface AudioFileInfo { name: string; path: string; size?: number }
export interface ProjectSummary { id: string; name: string; updated_at?: string }
export interface Project { id: string; name: string; audio_file?: string; triggers: TriggerPoint[] }
export interface TriggerPoint { id: string; time: number; pc: number; name: string; bank?: number | null; color?: string }
export interface MappingFileInfo { filename: string; tone_count: number }
export interface MappingTone { pc: number; name: string }
export interface AutoSetupResult { status: 'ready' | 'auto_mapped' | 'no_user_presets' | 'no_plugins'; plugin?: string; presets_mapped?: number }

// ── MIDI ──
export async function fetchMidiPorts(): Promise<{ ports: string[] }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/midi/ports`)
  if (!res.ok) throw new Error(`MIDI ports: ${res.status}`)
  return res.json()
}

export async function testMidi(portName: string, pc: number): Promise<{ success: boolean }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/midi/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ port: portName, pc }),
  })
  if (!res.ok) throw new Error(`Test: ${res.status}`)
  return res.json()
}

export async function selectMidiPort(portName: string): Promise<{ success: boolean }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/midi/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ port: portName }),
  })
  if (!res.ok) throw new Error(`SelectPort: ${res.status}`)
  return res.json()
}

// ── Plugins ──
export async function fetchPlugins(): Promise<{ plugins: PluginInfo[] }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/plugins`)
  if (!res.ok) throw new Error(`Plugins: ${res.status}`)
  return res.json()
}

// ── Presets ──
export async function fetchPresets(plugin: string, source?: string): Promise<{ presets: PresetInfo[] }> {
  const params = new URLSearchParams({ plugin })
  if (source) params.set('source', source)
  const res = await fetchWithTimeout(`${API_BASE}/api/presets?${params}`)
  if (!res.ok) throw new Error(`Presets: ${res.status}`)
  return res.json()
}

// ── MIDI Mapping ──
export async function autoMap(plugin: string, presets: string[]): Promise<{ success: boolean; message?: string }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/midi/automap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plugin, presets }),
  })
  if (!res.ok) throw new Error(`AutoMap: ${res.status}`)
  return res.json()
}

export async function installMapping(plugin: string, filename: string, xml: string): Promise<{ success: boolean }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/midi/install`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plugin, filename, xml }),
  })
  if (!res.ok) throw new Error(`Install: ${res.status}`)
  return res.json()
}

export async function fetchMappingFiles(plugin: string): Promise<{ files: MappingFileInfo[] }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/midi/mappings?plugin=${encodeURIComponent(plugin)}`)
  if (!res.ok) throw new Error(`MappingFiles: ${res.status}`)
  return res.json()
}

export async function fetchMappingTones(plugin: string, filename: string): Promise<{ tones: MappingTone[] }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/midi/mappings/${encodeURIComponent(plugin)}/${encodeURIComponent(filename)}`)
  if (!res.ok) throw new Error(`MappingTones: ${res.status}`)
  return res.json()
}

export async function generateMapping(plugin: string, presets: string[]): Promise<{ xml: string }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/midi/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plugin, presets }),
  })
  if (!res.ok) throw new Error(`Generate: ${res.status}`)
  return res.json()
}

// ── Audio ──
export async function uploadAudio(file: File): Promise<{ path: string; name: string }> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetchWithTimeout(`${API_BASE}/api/audio/upload`, {
    method: 'POST',
    body: formData,
  }, 60000)
  if (!res.ok) throw new Error(`Upload: ${res.status}`)
  return res.json()
}

export async function fetchAudioFiles(): Promise<{ files: AudioFileInfo[] }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/audio/files`)
  if (!res.ok) throw new Error(`AudioFiles: ${res.status}`)
  return res.json()
}

export async function fetchWaveform(path: string, numPeaks = 800): Promise<{ peaks: number[] }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/audio/waveform?path=${encodeURIComponent(path)}&num_peaks=${numPeaks}`)
  if (!res.ok) throw new Error(`Waveform: ${res.status}`)
  return res.json()
}

// ── Projects ──
export async function fetchProjects(): Promise<{ projects: ProjectSummary[] }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/projects`)
  if (!res.ok) throw new Error(`Projects: ${res.status}`)
  return res.json()
}

export async function fetchProject(id: string): Promise<Project> {
  const res = await fetchWithTimeout(`${API_BASE}/api/projects/${id}`)
  if (!res.ok) throw new Error(`Project: ${res.status}`)
  return res.json()
}

export async function createProject(data: { name: string }): Promise<Project> {
  const res = await fetchWithTimeout(`${API_BASE}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`CreateProject: ${res.status}`)
  return res.json()
}

export async function updateProject(id: string, data: Partial<Project>): Promise<Project> {
  const res = await fetchWithTimeout(`${API_BASE}/api/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`UpdateProject: ${res.status}`)
  return res.json()
}

export async function deleteProject(id: string): Promise<{ success: boolean }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/projects/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`DeleteProject: ${res.status}`)
  return res.json()
}

// ── Init / Auto Setup ──
export async function initAutoSetup(): Promise<AutoSetupResult> {
  const res = await fetchWithTimeout(`${API_BASE}/api/init/auto-setup`, { method: 'POST' })
  if (!res.ok) throw new Error(`AutoSetup: ${res.status}`)
  return res.json()
}
