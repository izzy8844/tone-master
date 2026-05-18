'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Save, Cloud, CloudOff, FolderOpen, Settings, BookOpen, Pencil, Upload, Menu } from 'lucide-react'
import { usePlaybackStore } from '@/stores/playbackStore'
import { useProjectStore } from '@/stores/projectStore'
import { useAuthStore } from '@/store/authStore'
import { useGatekeeper } from '@/hooks/useGatekeeper'
import { useCloudSync } from '@/hooks/useCloudSync'
import { useWebSocket } from '@/hooks/useWebSocket'
import { Transport } from '@/components/Transport'
import { TimelineRuler } from '@/components/TimelineRuler'
import { Waveform } from '@/components/Waveform'
import { TriggerList } from '@/components/TriggerList'
import { ProjectSidebar } from '@/components/ProjectSidebar'
import { StatusBar } from '@/components/StatusBar'
import { ToneMappingSelector } from '@/components/ToneMappingSelector'
import ToneAddDialog from '@/components/ToneAddDialog'
import ExportButton from '@/components/ExportButton'
import UserMenu from '@/components/UserMenu'
import { toast } from '@/components/Toast'
import { API_BASE } from '@/lib/api'

const ALLOWED_EXTS = /\.(mp3|wav|flac|ogg|m4a|aac|wma)$/i
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

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
  const [addDialogTime, setAddDialogTime] = useState(0)
  const [waveformData, setWaveformData] = useState<number[] | undefined>(undefined)

  // Init project
  useEffect(() => {
    if (!useProjectStore.getState().currentProject && !useProjectStore.getState().isDemo) {
      useProjectStore.getState().newProject()
    }
  }, [])

  // Sync editName with projectName
  useEffect(() => {
    if (!isEditingName) setEditName(projectName)
  }, [projectName, isEditingName])

  // Fetch waveform when audio loads  
  useEffect(() => {
    const audioFile = useProjectStore.getState().audioFile
    if (!audioFile) { setWaveformData(undefined); return }
    fetch(`${API_BASE}/api/audio/waveform?path=${encodeURIComponent(audioFile)}&num_peaks=800`)
      .then(r => r.ok ? r.json() : null).then(d => { if (d?.peaks) setWaveformData(d.peaks) }).catch(() => {})
  }, [useProjectStore((s) => s.audioFile)])

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
    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large (max 100MB)')
      e.target.value = ''
      return
    }
    // Validate format
    if (!ALLOWED_EXTS.test(file.name)) {
      toast.error('Unsupported format (.mp3, .wav, .flac, .ogg, .m4a, .aac, .wma)')
      e.target.value = ''
      return
    }
    const formData = new FormData(); formData.append('file', file)
    try {
      const res = await fetch(`${API_BASE}/api/audio/upload`, { method: 'POST', body: formData })
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
      const data = await res.json()
      if (data.success && data.path) {
        useProjectStore.getState().setAudioFile(data.path)
        send({ type: 'load_audio', path: data.path })
      }
    } catch {
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
              onKeyDown={e => { if (e.key === 'Enter') { setProjectName(editName || 'Untitled Project'); setIsEditingName(false) } }}
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
          <button onClick={handleUpload} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-800" title="Upload audio">
            <Upload className="w-4 h-4" /><span>Upload</span>
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
