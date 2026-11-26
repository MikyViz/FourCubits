import { chance, weightedPick } from '../core/rng'
import type { GameState, Resources } from '../core/types'
import { diff } from '../data/difficulty'
import { EVENTS } from '../data/events'
import { t } from '../i18n'

export function eventTick(s: GameState) {
  if (s.pendingEventId || !chance(s, diff(s).eventChance)) return
  const ev = weightedPick(s, EVENTS, (e) => e.weight(s))
  if (!ev) return
  s.pendingEventId = ev.id
  if (ev.needsVillage) {
    // враждебные деревни выбираются чаще
    const v = weightedPick(s, s.villages, (v) => 2.5 - v.attitude)
    s.pendingVillageId = v ? v.id : null
  }
}

// для UI: событие с переведёнными текстами и названием деревни
export function describePending(
  s: GameState,
): { title: string; text: string; choices: { label: string; cost?: Partial<Resources> }[] } | null {
  const ev = EVENTS.find((e) => e.id === s.pendingEventId)
  if (!ev) return null
  const v = s.villages.find((x) => x.id === s.pendingVillageId)
  return {
    title: t(`ev.${ev.id}.title`),
    text: t(`ev.${ev.id}.text`, { village: v ? t(`village.${v.id}`) : '' }),
    choices: ev.choices.map((c, i) => ({ label: t(`ev.${ev.id}.c${i}`), cost: c.cost })),
  }
}
