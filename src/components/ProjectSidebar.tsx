'use client'
import { Plus } from 'lucide-react'
import { useMapperStore } from '@/stores/mapperStore'

export function ProjectSidebar() {
  const { projects, currentProject, setCurrentProject } = useMapperStore()

  return (
    <aside className="w-[280px] h-full bg-zinc-950 border-r border-zinc-800 flex flex-col">
      <div className="px-4 py-3 flex items-center justify-between border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-white">Projects</h2>
        <button className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {projects.map(p => (
          <button
            key={p.id}
            onClick={() => setCurrentProject(p)}
            className={`w-full text-left px-4 py-3 border-b border-zinc-800/50 transition-colors ${
              currentProject?.id === p.id
                ? 'bg-zinc-800/50 border-l-2 border-l-green-500'
                : 'hover:bg-zinc-900'
            }`}
          >
            <div className={`text-sm ${currentProject?.id === p.id ? 'text-white' : 'text-zinc-300'}`}>
              {p.name}
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">
              {p.triggers.length} triggers · {p.audioFile || 'No audio'}
            </div>
          </button>
        ))}
      </div>
    </aside>
  )
}
