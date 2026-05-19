'use client'
import { useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useProjectStore } from '@/stores/projectStore'
import type { GateAction, GateModalPayload } from '@/lib/types'

interface Rule { check: (ctx: { tier: string; triggerCount: number }) => GateModalPayload | null }

const RULES: Record<GateAction, Rule> = {
  import_audio: { check: ({ tier }) => tier === 'guest' ? { action: 'import_audio', title: 'Import Audio', message: 'Sign in to import audio files.', requiredTier: 'free' } : null },
  save_project: { check: ({ tier }) => tier === 'guest' ? { action: 'save_project', title: 'Save Project', message: 'Sign in to save projects to the cloud.', requiredTier: 'free' } : null },
  add_trigger: { check: ({ tier, triggerCount }) => {
    if (tier === 'guest' && triggerCount >= 3) return { action: 'add_trigger', title: 'Trigger Limit', message: 'Sign in to add more presets (up to 10 free).', requiredTier: 'free' }
    if (tier === 'free' && triggerCount >= 10) return { action: 'add_trigger', title: 'Pro Required', message: 'Upgrade to Pro for unlimited triggers.', requiredTier: 'pro' }
    return null
  }},
  export_xml: { check: ({ tier }) => tier !== 'pro' ? { action: 'export_xml', title: 'Pro Feature', message: 'Upgrade to Pro to export MIDI files.', requiredTier: 'pro' } : null },
}

function checkPermission(action: GateAction, ctx: { tier: string; triggerCount: number }): boolean {
  const rule = RULES[action]; if (!rule) return true; return rule.check(ctx) === null
}

export function useGatekeeper() {
  const tier = useAuthStore((s) => s.tier)
  const openGate = useAuthStore((s) => s.openGate)
  const triggerCount = useProjectStore((s) => s.triggers?.length ?? 0)

  const canPerform = useCallback((action: GateAction): boolean => checkPermission(action, { tier, triggerCount }), [tier, triggerCount])
  const guard = useCallback((action: GateAction, callback: () => void): boolean => {
    const rule = RULES[action]; const payload = rule.check({ tier, triggerCount })
    if (payload) { openGate(payload); return false }
    callback(); return true
  }, [tier, openGate, triggerCount])

  return { guard, canPerform }
}
