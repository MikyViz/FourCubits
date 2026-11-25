import type { GameState } from '../core/types'
import { clamp } from '../core/util'

export function pressureTick(s: GameState) {
  s.scrutiny = clamp(s.scrutiny - 0.3, 0, 100)
}
