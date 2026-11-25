import type { GameState } from '../core/types'
import { log } from '../core/util'
import { BUILDINGS } from '../data/buildings'

export function constructionTick(s: GameState) {
  if (s.day < s.frozenUntil) return // стройка заморожена
  for (const b of s.buildings) {
    if (b.done) continue
    b.daysLeft--
    if (b.daysLeft <= 0) {
      b.done = true
      if (!b.legal) {
        s.scrutiny += 8
        log(s, `${BUILDINGS[b.type].label} достроен вне границ, внимание растёт`)
      }
    }
  }
}
