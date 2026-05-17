'use client'

import { useRef, useEffect, useCallback } from 'react'
import { useMapperStore } from '@/stores/mapperStore'

interface WaveformProps {
  waveformData?: number[]
  onTriggerDrag?: (triggerId: string, newTimeMs: number) => void
}

export function Waveform({ waveformData, onTriggerDrag }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { positionMs, durationMs, currentProject, activeTriggerIndex, isPlaying } = useMapperStore()
  const triggers = currentProject?.triggers || []
  const positionRef = useRef(positionMs)
  const rafRef = useRef<number>(0)

  positionRef.current = positionMs

  const draw = useCallback((currentPositionMs: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas.getBoundingClientRect()
    canvas.width = width * 2
    canvas.height = height * 2
    ctx.scale(2, 2)

    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, width, height)

    if (waveformData && waveformData.length > 0) {
      const barWidth = width / waveformData.length
      const centerY = height / 2
      ctx.fillStyle = '#27272a'
      for (let i = 0; i < waveformData.length; i++) {
        const amp = waveformData[i] * (height * 0.4)
        ctx.fillRect(i * barWidth, centerY - amp, Math.max(1, barWidth - 1), amp * 2)
      }
    }

    const abLoop = currentProject?.abLoop
    if (abLoop && durationMs > 0) {
      const loopLeft = (abLoop.startMs / durationMs) * width
      const loopWidth = ((abLoop.endMs - abLoop.startMs) / durationMs) * width
      ctx.fillStyle = 'rgba(34, 197, 94, 0.1)'
      ctx.fillRect(loopLeft, 0, loopWidth, height)
    }

    if (durationMs > 0) {
      triggers.forEach((t, idx) => {
        const x = (t.time * 1000 / durationMs) * width
        const isActive = idx === activeTriggerIndex
        ctx.strokeStyle = isActive ? '#22c55e' : '#4ade80'
        ctx.lineWidth = isActive ? 2 : 1
        ctx.setLineDash(isActive ? [] : [4, 4])
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = isActive ? '#22c55e' : '#a1a1aa'
        ctx.font = '10px Inter, sans-serif'
        ctx.fillText(t.toneName, x + 4, 12)
      })

      const playX = (currentPositionMs / durationMs) * width
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(playX, 0)
      ctx.lineTo(playX, height)
      ctx.stroke()
    }
  }, [waveformData, durationMs, triggers, activeTriggerIndex, currentProject?.abLoop])

  // Full redraw on data changes
  useEffect(() => { draw(positionRef.current) }, [draw])

  // RAF-based playhead redraw when playing
  useEffect(() => {
    let rafId: number
    const loop = () => {
      if (useMapperStore.getState().isPlaying) {
        draw(positionRef.current)
        rafId = requestAnimationFrame(loop)
      }
    }
    if (isPlaying) rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [isPlaying, draw])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!onTriggerDrag || durationMs === 0) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickTimeMs = (clickX / rect.width) * durationMs

    const threshold = (10 / rect.width) * durationMs
    const nearest = triggers.find(t => Math.abs(t.time * 1000 - clickTimeMs) < threshold)
    if (!nearest) return

    const onMove = (me: MouseEvent) => {
      const mx = me.clientX - rect.left
      const newTimeMs = Math.max(0, Math.min(durationMs, (mx / rect.width) * durationMs))
      onTriggerDrag(nearest.id, newTimeMs)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [durationMs, triggers, onTriggerDrag])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-32 rounded-lg cursor-crosshair"
      onMouseDown={handleMouseDown}
    />
  )
}
