'use client'
import { usePlaybackStore } from '@/stores/playbackStore'

export function TimelineRuler() {
  const duration = usePlaybackStore((s) => s.duration)
  if (duration === 0) return null

  const markers: { time: string; pct: number }[] = []
  const intervalS = duration > 120 ? 30 : duration > 60 ? 15 : 10
  for (let sec = 0; sec <= duration; sec += intervalS) {
    const m = Math.floor(sec / 60); const s = sec % 60
    markers.push({ time: `${m}:${String(s).padStart(2, '0')}`, pct: (sec / duration) * 100 })
  }
  return (
    <div className="relative w-full h-5 text-[10px] text-zinc-500 font-mono select-none">
      {markers.map((m, i) => <span key={i} className="absolute top-0 -translate-x-1/2" style={{ left: `${m.pct}%` }}>{m.time}</span>)}
    </div>
  )
}
