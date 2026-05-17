'use client'
import { useRef, useEffect, useCallback, useState } from 'react'
import { usePlaybackStore } from '@/stores/playbackStore'
import { useProjectStore } from '@/stores/projectStore'

interface WaveformProps {
  waveformData?: number[]
  onTriggerDrag?: (triggerId: string, newTimeMs: number) => void
  onAddTrigger?: (timeMs: number) => void
}

export function Waveform({ waveformData, onTriggerDrag, onAddTrigger }: WaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { currentTick, duration, activeTriggerIndex, isPlaying, zoom, setZoom } = usePlaybackStore()
  const triggers = useProjectStore((s) => s.triggers)
  const positionRef = useRef(currentTick)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; triggerId: number } | null>(null)

  positionRef.current = currentTick
  const pxPerSec = 100 * zoom

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = duration * pxPerSec || 800
    canvas.width = w * 2; canvas.style.width = `${w}px`
    canvas.height = 128 * 2; canvas.style.height = '128px'
    ctx.scale(2, 2)

    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, w, 128)

    // Waveform
    if (waveformData && waveformData.length > 0) {
      const barW = w / waveformData.length
      const cy = 64
      ctx.fillStyle = '#27272a'
      for (let i = 0; i < waveformData.length; i++) {
        const amp = waveformData[i] * 50
        ctx.fillRect(i * barW, cy - amp, Math.max(1, barW - 1), amp * 2)
      }
    }

    // AB Loop overlay
    const pb = usePlaybackStore.getState()
    if (pb.abLoopEnabled && pb.loopA != null && pb.loopB != null && duration > 0) {
      const la = (pb.loopA / duration) * w
      const lw = ((pb.loopB - pb.loopA) / duration) * w
      ctx.fillStyle = 'rgba(59, 130, 246, 0.15)'
      ctx.fillRect(la, 0, lw, 128)
    }

    // Trigger markers
    if (duration > 0) {
      triggers.forEach((t, idx) => {
        const x = (t.time / duration) * w
        ctx.strokeStyle = idx === activeTriggerIndex ? '#22c55e' : '#4ade80'
        ctx.lineWidth = idx === activeTriggerIndex ? 2 : 1
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 128); ctx.stroke()
        ctx.fillStyle = idx === activeTriggerIndex ? '#22c55e' : '#a1a1aa'
        ctx.font = '10px Inter, sans-serif'
        ctx.fillText(t.name, x + 4, 12)
      })

      // Playhead
      const px = (currentTick / duration) * w
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, 128); ctx.stroke()
    }
  }, [waveformData, duration, triggers, activeTriggerIndex, currentTick, pxPerSec, zoom])

  useEffect(() => { draw() }, [draw])
  useEffect(() => {
    if (!isPlaying) return
    let raf: number
    const loop = () => { draw(); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [isPlaying, draw])

  // Auto-scroll
  useEffect(() => {
    if (!isPlaying || !containerRef.current) return
    const px = currentTick * pxPerSec
    const vw = containerRef.current.clientWidth
    if (px > containerRef.current.scrollLeft + vw * 0.8) {
      containerRef.current.scrollLeft = px - vw * 0.3
    }
  }, [currentTick, isPlaying, pxPerSec])

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setZoom(p => Math.max(0.25, Math.min(4, e.deltaY < 0 ? p * 1.2 : p / 1.2)))
  }, [setZoom])

  // Right-click context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    if (duration === 0) return
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left; const clickTime = (x / (duration * pxPerSec / zoom) * duration)
    const threshold = (15 / rect.width) * duration
    const nearest = triggers.find(t => Math.abs(t.time - clickTime) < threshold)
    if (nearest) {
      setContextMenu({ x: e.clientX, y: e.clientY, triggerId: nearest.id })
    }
  }, [duration, triggers, pxPerSec, zoom])

  // Close context menu
  useEffect(() => {
    if (!contextMenu) return
    const h = () => setContextMenu(null)
    document.addEventListener('click', h)
    return () => document.removeEventListener('click', h)
  }, [contextMenu])

  // Mouse drag triggers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!onTriggerDrag || duration === 0) return
    const rect = canvasRef.current!.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickTime = (clickX / (duration * pxPerSec / zoom) * duration)
    const threshold = (15 / rect.width) * duration
    const nearest = triggers.find(t => Math.abs(t.time - clickTime) < threshold)
    if (!nearest) return

    const onMove = (me: MouseEvent) => {
      const mx = me.clientX - rect.left
      const newTime = Math.max(0, Math.min(duration, (mx / (duration * pxPerSec / zoom) * duration)))
      onTriggerDrag(String(nearest.id), newTime * 1000)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', () => document.removeEventListener('mousemove', onMove), { once: true })
  }, [duration, triggers, onTriggerDrag, pxPerSec, zoom])

  // Double-click to add
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!onAddTrigger || duration === 0) return
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const timeMs = (x / (duration * pxPerSec / zoom) * duration * 1000)
    onAddTrigger(timeMs)
  }, [duration, onAddTrigger, pxPerSec, zoom])

  return (
    <div ref={containerRef} className="overflow-x-auto overflow-y-hidden rounded-lg" onWheel={handleWheel}>
      <div style={{ minWidth: Math.max(800, duration * pxPerSec) + 20 }}>
        <canvas ref={canvasRef} className="h-32 cursor-crosshair"
          onMouseDown={handleMouseDown} onDoubleClick={handleDoubleClick} onContextMenu={handleContextMenu} />
        {contextMenu && (
          <div className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1" style={{ left: contextMenu.x, top: contextMenu.y }}>
            <button onClick={() => { useProjectStore.getState().removeTrigger(contextMenu.triggerId); setContextMenu(null) }}
              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-zinc-800">Delete Trigger</button>
          </div>
        )}
      </div>
    </div>
  )
}
