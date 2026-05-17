'use client'

import { useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useMapperStore, type ProjectData } from '@/stores/mapperStore'

export function ProjectSidebar() {
  const projects = useMapperStore((s) => s.projects)
  const currentProject = useMapperStore((s) => s.currentProject)
  const setCurrentProject = useMapperStore((s) => s.setCurrentProject)
  const setProjects = useMapperStore((s) => s.setProjects)

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(d => {
      setProjects(d.projects || [])
    }).catch(() => {})
  }, [setProjects])

  const handleNew = async () => {
    try {
      const res = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'New Project' }) })
      const data = await res.json()
      if (data.project) {
        setCurrentProject(data.project as ProjectData)
        fetch('/api/projects').then(r => r.json()).then(d => setProjects(d.projects || []))
      }
    } catch (e) { console.error(e) }
  }

  const handleLoad = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`)
      const data = await res.json()
      if (data.project) setCurrentProject(data.project as ProjectData)
    } catch (e) { console.error(e) }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      fetch('/api/projects').then(r => r.json()).then(d => setProjects(d.projects || []))
    } catch (e) { console.error(e) }
  }

  return (
    <aside className="w-[280px] h-full bg-zinc-950 border-r border-zinc-800 flex flex-col">
      <div className="px-4 py-3 flex items-center justify-between border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-white">Projects</h2>
        <button onClick={handleNew} className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white"><Plus className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {projects.map((p: any) => (
          <button key={p.id} onClick={() => handleLoad(p.id)}
            className={`w-full text-left px-4 py-3 border-b border-zinc-800/50 transition-colors ${currentProject?.id === p.id ? 'bg-zinc-800/50 border-l-2 border-l-green-500' : 'hover:bg-zinc-900'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-300">{p.name}</span>
              <button onClick={e => { e.stopPropagation(); handleDelete(p.id) }}
                className="opacity-0 hover:opacity-100 text-zinc-600 hover:text-red-400 text-xs">×</button>
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">{p.trigger_count || 0} triggers</div>
          </button>
        ))}
      </div>
    </aside>
  )
}
