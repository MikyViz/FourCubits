import { build, extendLegalZone, resolveEvent } from './src/core/actions'
import { createInitialState } from './src/core/state'
import { tick } from './src/core/tick'
import type { BuildingType, GameState } from './src/core/types'
import { EVENTS } from './src/data/events'
import { canAfford } from './src/core/util'

function pickTile(s: GameState, wantLegal: boolean): [number, number] | null {
  for (let y = 0; y < s.map.h; y++) for (let x = 0; x < s.map.w; x++) {
    if (s.map.legal[y * s.map.w + x] === wantLegal && !s.buildings.some(b => b.x === x && b.y === y)) return [x, y]
  }
  return null
}

function play(seed: number, illegalRate: number) {
  const s = createInitialState(seed)
  let order: BuildingType[] = ['house', 'storage', 'house', 'guardpost']
  let i = 0
  let guard = 0
  while (s.status === 'playing' && s.day < 400 && guard++ < 5000) {
    if (s.pendingEventId) {
      const ev = EVENTS.find(e => e.id === s.pendingEventId)!
      let idx = ev.choices.findIndex(c => !c.cost || canAfford(s, c.cost))
      if (idx < 0) idx = 0
      if (resolveEvent(s, idx)) resolveEvent(s, ev.choices.length - 1)
    }
    if (s.day % 3 === 0 && s.resources.money > 120) {
      const t = pickTile(s, Math.random() > illegalRate) ?? pickTile(s, true) ?? pickTile(s, false)
      if (t) build(s, order[i++ % order.length], t[0], t[1])
    }
    if (s.resources.permits >= 5 && s.resources.money > 200 && s.buildings.some(b => !b.legal)) {
      const b = s.buildings.find(b => !b.legal)!
      extendLegalZone(s, b.x, b.y)
    }
    tick(s)
  }
  return s
}

for (const rate of [0, 0.5]) {
  const res = { won: 0, lost: 0, playing: 0 }; let days = 0
  for (let seed = 1; seed <= 200; seed++) { const s = play(seed, rate); res[s.status]++; days += s.day }
  console.log(`illegalRate=${rate}`, res, 'avg days', Math.round(days / 200))
}
