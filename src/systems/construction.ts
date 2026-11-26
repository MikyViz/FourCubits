import type { GameState } from '../core/types'
import { addScrutiny, log } from '../core/util'
import { ILLEGAL_SCRUTINY } from '../data/buildings'

export function constructionTick(s: GameState) {
  if (s.day < s.frozenUntil) return // стройка заморожена
  for (const b of s.buildings) {
    if (b.done) continue
    b.daysLeft--
    if (b.daysLeft <= 0) {
      b.done = true
      if (!b.legal) {
        addScrutiny(s, ILLEGAL_SCRUTINY)
        log(s, 'log.builtIllegal', { b: { key: `b.${b.type}.name` } })
      }
    }
  }
}
