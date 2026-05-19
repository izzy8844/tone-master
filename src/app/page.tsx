'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Save, Cloud, CloudOff, FolderOpen, Settings, BookOpen, Pencil, Upload, Menu, Loader2 } from 'lucide-react'
import { usePlaybackStore, hydratePlaybackStore } from '@/stores/playbackStore'
import { useProjectStore, hydrateProjectStore } from '@/stores/projectStore'
import { useAuthStore } from '@/store/authStore'
import { useGatekeeper } from '@/hooks/useGatekeeper'
import { useCloudSync } from '@/hooks/useCloudSync'
import { useWebSocket } from '@/hooks/useWebSocket'
import { Transport } from '@/components/Transport'
import { TimelineRuler } from '@/components/TimelineRuler'
import { Waveform } from '@/components/Waveform'
import { ToneSegments } from '@/components/ToneSegments'
import { TriggerList } from '@/components/TriggerList'
import { ProjectSidebar } from '@/components/ProjectSidebar'
import { StatusBar } from '@/components/StatusBar'
import { ToneMappingSelector } from '@/components/ToneMappingSelector'
import ToneAddDialog from '@/components/ToneAddDialog'
import ExportButton from '@/components/ExportButton'
import UserMenu from '@/components/UserMenu'
import { toast } from '@/components/Toast'

import { API_BASE, initAutoSetup } from '@/lib/api'
import { useMapperStore } from '@/stores/mapperStore'

export default function Home() {
  const projectName = useProjectStore((s) => s.projectName)
  const isSignedIn = useAuthStore((s) => s.isSignedIn)
  const { guard } = useGatekeeper()
  const { saveToCloud, syncStatus } = useCloudSync()
  const { send } = useWebSocket()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const triggers = useProjectStore((s) => s.triggers)
  const sidebarOpen = useProjectStore((s) => s.sidebarOpen)
  const setSidebarOpen = useProjectStore((s) => s.setSidebarOpen)

  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState(projectName)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Sync editName when projectName changes externally (hydration, project switch)
  useEffect(() => { if (!isEditingName) setEditName(projectName) }, [projectName, isEditingName])
  const [addDialogTime, setAddDialogTime] = useState(0)
  const [waveformData, setWaveformData] = useState<number[] | undefined>(undefined)

  // Hydrate stores and init project (synchronous — no race condition)
  useEffect(() => {
    hydrateProjectStore()
    hydratePlaybackStore()
    if (!useProjectStore.getState().currentProject && !useProjectStore.getState().isDemo) {
      useProjectStore.getState().newProject()
    }
  }, [])

  // Auto-setup on EVERY launch: detect ALL plugins, regenerate tonemaster-user.xml
  useEffect(() => {
    const mapper = useMapperStore.getState()

    mapper.setInitStatus('loading')
    initAutoSetup()
      .then((result) => {
        const m = useMapperStore.getState()
        m.setAutoSetupDone(true)

        // New multi-plugin format: result.results[] — legacy: single plugin
        const raw: any = result
        const items: any[] = (raw.results || [raw]) as any[]
        const mapped = items.filter((r: any) => r.mapping_installed)
        const noPresets = items.filter((r: any) => r.status === 'no_user_presets')

        // Pick first plugin that has presets for active selection
        const firstWithPresets = items.find((r: any) =>
          r.status === 'auto_mapped' || r.status === 'ready'
        )

        if (firstWithPresets) {
          m.setSelectedPlugin(firstWithPresets.plugin)
          m.setPlugins(items.map((r: any) => r.plugin).filter(Boolean))

          if (firstWithPresets.mapping_file) {
            m.setActiveMappingFile(firstWithPresets.mapping_file)
          }
          const presets = firstWithPresets.user_presets || []
          if (presets.length > 0) {
            m.setUserPresets(presets)
            m.setActiveMappingTones(presets.map((p: any) => ({ name: p.name, pc: p.pc, uid: p.uid })))
          }
        }

        if (mapped.length > 0) {
          const pluginNames = mapped.map((r: any) => r.plugin).join(', ')
          const totalPresets = mapped.reduce((sum: number, r: any) => sum + (r.preset_count || 0), 0)
          m.setInitStatus('auto_mapped')
          toast.success(`Auto-mapped ${totalPresets} presets across ${pluginNames}`)
        } else if (noPresets.length > 0 && firstWithPresets) {
          m.setInitStatus('ready')
        } else {
          m.setInitStatus('no_user_presets')
        }
      })
      .catch(() => {
        useMapperStore.getState().setInitStatus('error')
        useMapperStore.getState().setAutoSetupDone(true)
      })
  }, [])

  // Fetch waveform when audio loads (only for server-hosted files with a path separator)
  const audioFile = useProjectStore((s) => s.audioFile)
  useEffect(() => {
    if (!audioFile) { setWaveformData(undefined); return }
    // Skip waveform fetch for local-only filenames (fallback decode path stores bare names like "song.mp3")
    if (!audioFile.includes('/')) { setWaveformData(undefined); return }
    fetch(`${API_BASE}/api/audio/waveform?path=${encodeURIComponent(audioFile)}&num_peaks=800`)
      .then(r => r.ok ? r.json() : null).then(d => { if (d?.peaks) setWaveformData(d.peaks) }).catch(() => {})
  }, [audioFile])

  const handleSave = () => {
    guard('save_project', () => {
      if (isSignedIn) { saveToCloud(); toast.success('Project saved to cloud') }
      else toast.info('Signed out — saving locally')
    })
  }

  const setProjectName = (name: string) => {
    useProjectStore.getState().setProjectName(name)
  }

  const handleAddTrigger = useCallback((timeSec: number) => {
    setAddDialogTime(timeSec)
    setAddDialogOpen(true)
  }, [])

  const handleTriggerDrag = useCallback((triggerId: string, newTimeMs: number) => {
    useProjectStore.getState().updateTrigger(Number(triggerId), { time: newTimeMs / 1000 })
  }, [])

  const handleUpload = () => fileInputRef.current?.click()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Stop playback before uploading new audio to avoid desync
    if (usePlaybackStore.getState().isPlaying) {
      send({ type: 'playback_command', command: 'stop' })
      usePlaybackStore.getState().setIsPlaying(false)
      usePlaybackStore.getState().setCurrentTick(0)
    }

    // Validate file size (max 100MB)
    const MAX_SIZE = 100 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      toast.error('File too large. Maximum size is 100 MB.')
      e.target.value = ''
      return
    }

    // Validate file type
    const ALLOWED_EXT = /\.(mp3|wav|flac|ogg|m4a|aac|wma)$/i
    if (!ALLOWED_EXT.test(file.name)) {
      toast.error('Unsupported format. Use MP3, WAV, FLAC, OGG, or M4A.')
      e.target.value = ''
      return
    }

    setUploading(true)
    const formData = new FormData(); formData.append('file', file)
    try {
      const res = await fetch(`${API_BASE}/api/audio/upload`, { method: 'POST', body: formData })
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
      const data = await res.json()
      if (data.path) {
        useProjectStore.getState().setAudioFile(data.path)
        if (data.duration_sec) usePlaybackStore.getState().setDuration(data.duration_sec)
        send({ type: 'load_audio', path: data.path })
      }
    } catch {
      // Fallback: decode locally
      let audioCtx: AudioContext | null = null
      try {
        audioCtx = new AudioContext()
        if (audioCtx.state === 'suspended') await audioCtx.resume()
        const arrayBuffer = await file.arrayBuffer()
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
        useProjectStore.getState().setAudioFile(file.name)
        usePlaybackStore.getState().setDuration(audioBuffer.duration)
      } catch {
        toast.error('Failed to load audio file')
      } finally {
        audioCtx?.close()
      }
    } finally {
      setUploading(false)
    }
    e.target.value = ''
  }

  const SyncIcon = syncStatus === 'syncing' ? Cloud : syncStatus === 'error' ? CloudOff : Save

  return (
    <div className="flex h-screen flex-col bg-[#0a0a0a]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800" title="Toggle sidebar">
            <Menu className="w-4 h-4" />
          </button>
          {isEditingName ? (
            <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
              onBlur={() => { setProjectName(editName || 'Untitled Project'); setIsEditingName(false) }}
              onKeyDown={e => { if (e.key === 'Enter') { setProjectName(editName || 'Untitled Project'); setIsEditingName(false) } if (e.key === 'Escape') setIsEditingName(false) }}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-green-500" autoFocus />
          ) : (
            <button onClick={() => { setEditName(projectName); setIsEditingName(true) }} className="flex items-center gap-2 group">
              <h1 className="text-lg font-semibold text-white truncate max-w-[300px]">{projectName}</h1>
              <Pencil className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <input ref={fileInputRef} type="file" accept=".mp3,.wav,.flac,.ogg,.m4a" className="hidden" onChange={handleFileChange} />
          <button onClick={handleUpload} disabled={uploading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed" title="Upload audio" aria-label="Upload audio file">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>{uploading ? 'Uploading...' : 'Upload Backing Track'}</span>
          </button>
          <ToneMappingSelector />
          <button onClick={handleSave} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-green-400 hover:border-green-500 text-xs ${syncStatus === 'syncing' ? 'animate-pulse' : ''}`}>
            <SyncIcon className="w-3.5 h-3.5" />
          </button>
          <ExportButton />
          <Link href="/projects" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 text-xs"><FolderOpen className="w-3.5 h-3.5" />Projects</Link>
          <Link href="/settings" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 text-xs"><Settings className="w-3.5 h-3.5" />Tones</Link>
          <Link href="/guide" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 text-xs"><BookOpen className="w-3.5 h-3.5" />Guide</Link>
          <UserMenu />
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && <ProjectSidebar />}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-col px-6 py-4 overflow-y-auto gap-4">
            <TimelineRuler />
            <Waveform waveformData={waveformData} onTriggerDrag={handleTriggerDrag} onAddTrigger={(timeMs) => handleAddTrigger(timeMs / 1000)} />
            <ToneSegments onTriggerDrag={handleTriggerDrag} />
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
              <span className="text-xs text-zinc-500 uppercase tracking-wide">Triggers</span>
              <button onClick={() => handleAddTrigger(usePlaybackStore.getState().currentTick)}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-green-600 hover:bg-green-500 text-white text-sm">+</button>
            </div>
            <TriggerList />
          </div>
          <Transport />
        </main>
      </div>
      <StatusBar />
      <ToneAddDialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} time={addDialogTime} />
    </div>
  )
}
