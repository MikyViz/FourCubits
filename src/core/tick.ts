import { constructionTick } from '../systems/construction'
import { economyTick } from '../systems/economy'
import { eventTick } from '../systems/events'
import { pressureTick } from '../systems/pressure'
import { diff } from '../data/difficulty'
import type { GameState } from './types'
import { log } from './util'

// MVP: победа = населённый, устойчивый посёлок. Сеть из нескольких посёлков добавим следующим шагом.
function checkEnd(s: GameState) {
  const r = s.resources
  if (r.morale <= 0 || r.people <= 0 || r.money < -200) {
    s.status = 'lost'
    log(s, 'log.lost')
  } else if (r.people >= diff(s).winPeople && r.morale >= 40) {
    s.status = 'won'
    log(s, 'log.won')
  }
}

export function tick(s: GameState) {
  if (s.status !== 'playing' || s.pendingEventId) return
  s.day++
  economyTick(s)
  constructionTick(s)
  pressureTick(s)
  eventTick(s)
  checkEnd(s)
}
