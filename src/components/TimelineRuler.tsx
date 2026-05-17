'use client'
import { useMapperStore } from '@/stores/mapperStore'

export function TimelineRuler() {
  const { durationMs } = useMapperStore()

  if (durationMs === 0) return null

  // Generate time markers
  const markers: { time: string; pct: number }[] = []
  const intervalMs = durationMs > 120000 ? 30000 : durationMs > 60000 ? 15000 : 10000

  for (let ms = 0; ms <= durationMs; ms += intervalMs) {
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    markers.push({
      time: `${m}:${String(s % 60).padStart(2, '0')}`,
      pct: (ms / durationMs) * 100
    })
  }

  return (
    <div className="relative w-full h-5 text-[10px] text-zinc-500 font-mono select-none">
      {markers.map((m, i) => (
        <span
          key={i}
          className="absolute top-0 -translate-x-1/2"
          style={{ left: `${m.pct}%` }}
        >
          {m.time}
        </span>
      ))}
    </div>
  )
}
