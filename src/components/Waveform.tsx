'use client'

import { useRef, useEffect, useCallback } from 'react'
import { usePlaybackStore } from '@/stores/playbackStore'
import { useProjectStore } from '@/stores/projectStore'

interface WaveformProps {
  waveformData?: number[]
  onTriggerDrag?: (triggerId: string, newTimeMs: number) => void
  onAddTrigger?: (timeMs: number) => void
}

export function Waveform({ waveformData, onTriggerDrag, onAddTrigger }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { currentTick, duration, activeTriggerIndex, isPlaying } = usePlaybackStore()
  const triggers = useProjectStore((s) => s.triggers)
  const positionRef = useRef(currentTick)

  positionRef.current = currentTick

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

    if (duration > 0) {
      triggers.forEach((t, idx) => {
        const x = (t.time / duration) * width
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
        ctx.fillText(t.name, x + 4, 12)
      })

      const playX = (currentPositionMs / duration) * width
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(playX, 0)
      ctx.lineTo(playX, height)
      ctx.stroke()
    }
  }, [waveformData, duration, triggers, activeTriggerIndex])

  useEffect(() => { draw(positionRef.current) }, [draw])

  useEffect(() => {
    let rafId: number
    const loop = () => {
      if (usePlaybackStore.getState().isPlaying) {
        draw(positionRef.current)
        rafId = requestAnimationFrame(loop)
      }
    }
    if (isPlaying) rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [isPlaying, draw])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!onTriggerDrag || duration === 0) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickTimeS = (clickX / rect.width) * duration

    const threshold = (10 / rect.width) * duration
    const nearest = triggers.find(t => Math.abs(t.time - clickTimeS) < threshold)
    if (!nearest) return

    const onMove = (me: MouseEvent) => {
      const mx = me.clientX - rect.left
      const newTime = Math.max(0, Math.min(duration, (mx / rect.width) * duration))
      onTriggerDrag(String(nearest.id), newTime)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [duration, triggers, onTriggerDrag])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!onAddTrigger || duration === 0) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const timeMs = (clickX / rect.width) * duration * 1000
    onAddTrigger(timeMs)
  }, [duration, onAddTrigger])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-32 rounded-lg cursor-crosshair"
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    />
  )
}
