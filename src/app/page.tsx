'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Save, Cloud, CloudOff, FolderOpen, Settings,
  Pencil,
} from 'lucide-react'
import { useProjectStore } from '@/store/projectStore'
import { useAuthStore } from '@/store/authStore'
import { useMapperStore } from '@/stores/mapperStore'
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
import { MidiLearnGuide } from '@/components/MidiLearnGuide'
import ToneAddDialog from '@/components/ToneAddDialog'
import ExportButton from '@/components/ExportButton'
import UserMenu from '@/components/UserMenu'
import { toast } from '@/components/Toast'

export default function Home() {
  const projectName = useProjectStore((s) => s.projectName)
  const setProjectName = useProjectStore((s) => s.setProjectName)
  const isDemo = useProjectStore((s) => s.isDemo)
  const isSignedIn = useAuthStore((s) => s.isSignedIn)
  const { guard } = useGatekeeper()
  const { saveToCloud, syncStatus } = useCloudSync()
  const { updateTriggers } = useWebSocket()

  const { positionMs, durationMs, currentProject, setActiveTriggerIndex, updateTrigger, addTrigger } = useMapperStore()
  const triggers = currentProject?.triggers || []

  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState(projectName)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addDialogTime, setAddDialogTime] = useState(0)

  // Sync triggers to WebSocket when they change
  useEffect(() => {
    if (triggers.length > 0) {
      updateTriggers(triggers.map(t => ({
        id: t.id,
        time: t.time,
        program: t.program,
        name: t.toneName,
        bank_msb: t.bankMsb,
        bank_lsb: t.bankLsb,
      })))
    }
  }, [triggers, updateTriggers])

  // Update active trigger index based on playhead
  useEffect(() => {
    if (durationMs > 0 && triggers.length > 0) {
      let active = -1
      for (let i = triggers.length - 1; i >= 0; i--) {
        if (triggers[i].time * 1000 <= positionMs) {
          active = i
          break
        }
      }
      setActiveTriggerIndex(active)
    }
  }, [positionMs, triggers, durationMs, setActiveTriggerIndex])

  const handleSave = () => {
    guard('save_project', () => {
      if (isSignedIn) {
        saveToCloud()
        toast.success('Project saved to cloud')
      } else {
        toast.info('Signed out — saving locally')
      }
    })
  }

  const handleAddTrigger = useCallback(
    (time: number) => {
      setAddDialogTime(time)
      setAddDialogOpen(true)
    },
    []
  )

  const handleTriggerDrag = useCallback(
    (triggerId: string, newTimeMs: number) => {
      updateTrigger(triggerId, { time: newTimeMs / 1000 })
    },
    [updateTrigger]
  )

  const SyncIcon = syncStatus === 'syncing' ? Cloud : syncStatus === 'error' ? CloudOff : Save

  return (
    <div className="flex h-screen flex-col bg-[#0a0a0a]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          {isEditingName ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => {
                setProjectName(editName || 'Untitled Project')
                setIsEditingName(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setProjectName(editName || 'Untitled Project')
                  setIsEditingName(false)
                }
              }}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-green-500"
              autoFocus
            />
          ) : (
            <button
              onClick={() => {
                setEditName(projectName)
                setIsEditingName(true)
              }}
              className="flex items-center gap-2 group"
            >
              <h1 className="text-lg font-semibold text-white truncate max-w-[300px]">
                {projectName}
              </h1>
              <Pencil className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0" />
            </button>
          )}
          {isDemo && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 uppercase tracking-wider">
              Demo
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <ToneMappingSelector />

          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-green-400 hover:border-green-500 text-xs transition-colors ${syncStatus === 'syncing' ? 'animate-pulse' : ''}`}
            title="Save project"
          >
            <SyncIcon className="w-3.5 h-3.5" />
          </button>

          <ExportButton />

          <Link
            href="/projects"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 text-xs transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Projects
          </Link>

          <Link
            href="/settings"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 text-xs transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Tones
          </Link>

          <MidiLearnGuide />

          <UserMenu />
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <ProjectSidebar />

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Timeline Section */}
          <div className="flex-1 flex flex-col px-6 py-4 overflow-y-auto gap-4">
            <TimelineRuler />
            <Waveform waveformData={undefined} onTriggerDrag={handleTriggerDrag} />
            <TriggerList />
          </div>

          {/* Transport */}
          <Transport />
        </main>
      </div>

      {/* StatusBar */}
      <StatusBar />

      {/* Dialogs */}
      <ToneAddDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        time={addDialogTime}
      />
    </div>
  )
}
