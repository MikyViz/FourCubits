import { chance, weightedPick } from '../core/rng'
import type { EventChoice, GameState } from '../core/types'
import { EVENTS } from '../data/events'

const DAILY_EVENT_CHANCE = 0.35

export function eventTick(s: GameState) {
  if (s.pendingEventId || !chance(s, DAILY_EVENT_CHANCE)) return
  const ev = weightedPick(s, EVENTS, (e) => e.weight(s))
  if (!ev) return
  s.pendingEventId = ev.id
  if (ev.needsVillage) {
    // враждебные деревни выбираются чаще
    const v = weightedPick(s, s.villages, (v) => 2.5 - v.attitude)
    s.pendingVillageId = v ? v.id : null
  }
}

// для UI: события с уже подставленным названием деревни
export function describePending(s: GameState): { title: string; text: string; choices: EventChoice[] } | null {
  const ev = EVENTS.find((e) => e.id === s.pendingEventId)
  if (!ev) return null
  const v = s.villages.find((x) => x.id === s.pendingVillageId)
  return { title: ev.title, text: ev.text.replace('{village}', v ? v.name : ''), choices: ev.choices }
}
