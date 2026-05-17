'use client'

import { useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useProjectStore, type ProjectData } from '@/stores/projectStore'

export function ProjectSidebar() {
  const projects = useProjectStore((s) => s.projects)
  const currentProject = useProjectStore((s) => s.currentProject)
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject)
  const setProjects = useProjectStore((s) => s.setProjects)

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(d => setProjects(d.projects || [])).catch(() => {})
  }, [setProjects])

  const handleNew = async () => {
    try {
      const res = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'New Project' }) })
      const data = await res.json()
      if (data.project) { setCurrentProject(data.project as ProjectData); fetch('/api/projects').then(r => r.json()).then(d => setProjects(d.projects || [])) }
    } catch {}
  }

  return (
    <aside className="w-[280px] h-full bg-zinc-950 border-r border-zinc-800 flex flex-col">
      <div className="px-4 py-3 flex items-center justify-between border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-white">Projects</h2>
        <button onClick={handleNew} className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white"><Plus className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {projects.map((p: any) => (
          <button key={p.id} onClick={async () => { const r = await fetch(`/api/projects/${p.id}`); const d = await r.json(); if (d.project) { setCurrentProject(d.project as ProjectData); useProjectStore.getState().loadProject(d.project as ProjectData) } }}
            className={`w-full text-left px-4 py-3 border-b border-zinc-800/50 transition-colors ${currentProject?.id === p.id ? 'bg-zinc-800/50 border-l-2 border-l-green-500' : 'hover:bg-zinc-900'}`}>
            <span className="text-sm text-zinc-300">{p.name}</span>
            <div className="text-xs text-zinc-500 mt-0.5">{p.trigger_count || 0} triggers</div>
          </button>
        ))}
      </div>
    </aside>
  )
}
