'use client'

import { useEffect, useState, useRef } from 'react'
import { Plus, FolderOpen, Loader2, AlertCircle } from 'lucide-react'
import { useProjectStore, type ProjectData } from '@/stores/projectStore'
import { API_BASE } from '@/lib/api'

export function ProjectSidebar() {
  const projects = useProjectStore((s) => s.projects)
  const currentProject = useProjectStore((s) => s.currentProject)
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject)
  const setProjects = useProjectStore((s) => s.setProjects)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const latestSelectRef = useRef<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`${API_BASE}/api/projects`)
      .then(r => {
        if (r.status === 401) throw new Error('Session expired — please sign in again')
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      })
      .then(d => setProjects(d.projects || []))
      .catch(e => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [setProjects])

  const handleNew = async () => {
    if (creating) return
    setCreating(true)
    try {
      const res = await fetch(`${API_BASE}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Project' })
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      if (data.project) {
        const raw = data.project
        const mapped: ProjectData = {
          id: raw.id,
          name: raw.name,
          audioFile: raw.audio_path ?? null,
          triggers: (raw.triggers || []).map((t: { id?: string | number; time?: number; tone_name?: string; name?: string; program?: number; pc?: number; color?: string }) => ({
            id: typeof t.id === 'string' ? Number(t.id) || Date.now() : (t.id ?? Date.now()),
            time: t.time ?? 0,
            pc: t.program ?? t.pc ?? 0,
            name: t.tone_name ?? t.name ?? `Tone ${t.program ?? t.pc ?? 0}`,
            color: t.color ?? '#f59e0b',
          })),
        }
        useProjectStore.getState().loadProject(mapped)
        const listRes = await fetch(`${API_BASE}/api/projects`)
        if (listRes.ok) {
          const listData = await listRes.json()
          setProjects(listData.projects || [])
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setCreating(false)
    }
  }

  const handleRetry = () => {
    setError(null)
    setLoading(true)
    fetch(`${API_BASE}/api/projects`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then(d => setProjects(d.projects || []))
      .catch(e => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }

  const handleSelect = async (id: string) => {
    latestSelectRef.current = id
    try {
      const r = await fetch(`${API_BASE}/api/projects/${id}`)
      if (!r.ok) throw new Error(`${r.status}`)
      if (latestSelectRef.current !== id) return
      const d = await r.json()
      if (latestSelectRef.current !== id) return
      if (d.project) {
        const raw = d.project
        const mapped: ProjectData = {
          id: raw.id,
          name: raw.name,
          audioFile: raw.audio_path ?? null,
          triggers: (raw.triggers || []).map((t: { id?: string | number; time?: number; tone_name?: string; name?: string; program?: number; pc?: number; bank?: number | null; color?: string }) => ({
            id: typeof t.id === 'string' ? Number(t.id) || Date.now() : (t.id ?? Date.now()),
            time: t.time ?? 0,
            pc: t.program ?? t.pc ?? 0,
            name: t.tone_name ?? t.name ?? `Tone ${t.program ?? t.pc ?? 0}`,
            color: t.color ?? '#f59e0b',
          })),
        }
        useProjectStore.getState().loadProject(mapped)
      }
    } catch (e) {
      if (latestSelectRef.current === id) {
        setError(e instanceof Error ? e.message : 'Load failed')
      }
    }
  }

  return (
    <aside className="w-[280px] h-full bg-zinc-950 border-r border-zinc-800 flex flex-col">
      <div className="px-4 py-3 flex items-center justify-between border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-white">Projects</h2>
        <button onClick={handleNew} disabled={creating} className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed" title="New Project" aria-label="Create new project">
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center h-32 text-zinc-500">
            <Loader2 className="w-5 h-5 animate-spin mb-2" />
            <span className="text-xs">Loading projects...</span>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="flex flex-col gap-2 mx-4 mt-4 px-3 py-2.5 rounded-lg bg-red-500/5 border border-red-500/20">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span className="text-xs text-red-300">{error}</span>
            </div>
            <button onClick={handleRetry} className="text-xs text-red-400 hover:text-red-300 underline self-start">
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-center px-6">
            <div className="w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center mb-3">
              <FolderOpen className="w-5 h-5 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-400 mb-1">No projects yet</p>
            <p className="text-xs text-zinc-600">Click + to create your first project</p>
          </div>
        )}

        {/* Project list */}
        {!loading && projects.map((p) => (
          <button
            key={p.id}
            onClick={() => handleSelect(String(p.id))}
            className={`w-full text-left px-4 py-3 border-b border-zinc-800/50 transition-colors ${
              currentProject?.id === p.id
                ? 'bg-zinc-800/50 border-l-2 border-l-green-500'
                : 'hover:bg-zinc-900'
            }`}
          >
            <span className="text-sm text-zinc-300">{p.name}</span>
            <div className="text-xs text-zinc-500 mt-0.5">{(Array.isArray(p.triggers) ? p.triggers.length : 0)} triggers</div>
          </button>
        ))}
      </div>
    </aside>
  )
}
