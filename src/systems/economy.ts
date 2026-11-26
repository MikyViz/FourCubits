import type { GameState } from '../core/types'
import { addRes, capacity, clamp, countDone, log } from '../core/util'
import { diff } from '../data/difficulty'
import {
  GUARDPOST_UPKEEP, MONEY_PER_PERSON, NEIGHBOR_RADIUS, PERMIT_PASSIVE, SEC_BASE, SEC_PER_BORDER,
  SEC_CRITICAL, SEC_LEAVE_EVERY, SEC_PER_EXPOSURE, SEC_PER_PERSON, SEC_POST, STORAGE_INCOME,
} from '../data/balance'

export function moneyBreakdown(s: GameState) {
  const people = MONEY_PER_PERSON * s.resources.people
  const storage = STORAGE_INCOME * countDone(s, 'storage')
  const upkeep = GUARDPOST_UPKEEP * countDone(s, 'guardpost')
  return { people, storage, upkeep, net: people + storage - upkeep }
}

// длина границы зоны в клетках: стороны разрешённых клеток, за которыми запрещённая клетка
export function zonePerimeter(s: GameState): number {
  const { w, h, legal } = s.map
  let n = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!legal[y * w + x]) continue
      if (y > 0 && !legal[(y - 1) * w + x]) n++
      if (y < h - 1 && !legal[(y + 1) * w + x]) n++
      if (x > 0 && !legal[y * w + x - 1]) n++
      if (x < w - 1 && !legal[y * w + x + 1]) n++
    }
  }
  return n
}

// близость построек к деревням: чем ближе и враждебнее деревня, тем больше
export function neighborExposure(s: GameState): number {
  let sum = 0
  for (const b of s.buildings) {
    for (const v of s.villages) {
      const d = Math.hypot(b.x - v.x, b.y - v.y)
      if (d < NEIGHBOR_RADIUS) sum += ((NEIGHBOR_RADIUS - d) / NEIGHBOR_RADIUS) * ((2.5 - v.attitude) / 2.5)
    }
  }
  return sum
}

// безопасность — запас: охрана его восстанавливает, а жители, граница и соседи расходуют
export function securityBreakdown(s: GameState) {
  const regen = SEC_BASE + SEC_POST * countDone(s, 'guardpost')
  const k = diff(s).securityLoad
  const people = SEC_PER_PERSON * s.resources.people * k
  const border = SEC_PER_BORDER * zonePerimeter(s) * k
  const neighbors = SEC_PER_EXPOSURE * neighborExposure(s) * k
  return { regen, people, border, neighbors, net: regen - people - border - neighbors }
}

export function economyTick(s: GameState) {
  addRes(s, { money: moneyBreakdown(s).net, permits: PERMIT_PASSIVE })

  // заявки на разрешения, у которых вышел срок
  const due = s.permitRequests.filter((r) => r.arriveDay <= s.day)
  if (due.length) {
    s.permitRequests = s.permitRequests.filter((r) => r.arriveDay > s.day)
    const gain = due.reduce((a, r) => a + r.gain, 0)
    addRes(s, { permits: gain })
    log(s, 'log.permitsArrived', { n: gain })
  }

  // рост населения: семьи приезжают, пока есть места и мораль не упала
  if (s.day % 5 === 0 && s.resources.people < capacity(s) && s.resources.morale > 30) {
    addRes(s, { people: 1 })
  }

  addRes(s, { security: securityBreakdown(s).net })

  // при критически низкой безопасности люди уезжают
  if (s.resources.security < SEC_CRITICAL && s.day % SEC_LEAVE_EVERY === 0 && s.resources.people > 0) {
    addRes(s, { people: -1, morale: -2 })
    log(s, 'log.familyLeft')
  }

  // мораль стремится к значению, зависящему от безопасности и давления
  const moraleTarget = 50 + (s.resources.security - 50) / 5 - s.scrutiny / 10
  s.resources.morale += clamp(moraleTarget - s.resources.morale, -1, 1)
}
