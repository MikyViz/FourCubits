import { PERMIT_REQUEST_COST, PERMIT_REQUEST_DAYS, PERMIT_REQUEST_GAIN, PERMIT_REQUEST_MAX, ZONE_MONEY, ZONE_PERMITS } from '../data/balance'
import { buildCost, moveFee } from '../data/buildings'
import { EVENTS } from '../data/events'
import { t } from '../i18n'
import type { Building, BuildingType, GameState } from './types'
import { addRes, canAfford, log, pay } from './util'

const bName = (type: BuildingType) => ({ key: `b.${type}.name` })

// Функции возвращают текст ошибки (уже на текущем языке) или null, если всё получилось.
export function build(s: GameState, type: BuildingType, x: number, y: number): string | null {
  if (s.status !== 'playing') return t('err.gameOver')
  if (s.pendingEventId) return t('err.resolveEvent')
  if (s.day < s.frozenUntil) return t('err.frozen')
  if (x < 0 || y < 0 || x >= s.map.w || y >= s.map.h) return t('err.outOfMap')
  if (s.buildings.some((b) => b.x === x && b.y === y)) return t('err.cellTaken')

  const legal = s.map.legal[y * s.map.w + x]
  const { money, days } = buildCost(type, legal)
  const cost = { money }
  if (!canAfford(s, cost)) return t('err.needMoney', { n: money })

  pay(s, cost)
  s.buildings.push({
    id: s.nextId++,
    type,
    x,
    y,
    legal,
    daysLeft: days,
    done: false,
    placedDay: s.day,
    paid: money,
  })
  return null
}

// расширение разрешённой зоны: тратит разрешения и деньги, легализует уже стоящие постройки внутри
export function extendLegalZone(s: GameState, cx: number, cy: number, r = 2): string | null {
  const cost = { permits: ZONE_PERMITS, money: ZONE_MONEY }
  if (s.status !== 'playing') return t('err.gameOver')
  if (s.pendingEventId) return t('err.resolveEvent')
  if (!canAfford(s, cost)) return t('err.zoneNeeds')
  pay(s, cost)
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++)
      if (x >= 0 && y >= 0 && x < s.map.w && y < s.map.h) s.map.legal[y * s.map.w + x] = true
  for (const b of s.buildings) if (s.map.legal[b.y * s.map.w + b.x]) b.legal = true
  log(s, 'log.zoneExtended')
  return null
}

export function resolveEvent(s: GameState, choiceIndex: number): string | null {
  const ev = EVENTS.find((e) => e.id === s.pendingEventId)
  if (!ev) return t('err.noEvent')
  const choice = ev.choices[choiceIndex]
  if (!choice) return t('err.noChoice')
  if (choice.cost && !canAfford(s, choice.cost)) return t('err.noResources')

  if (choice.cost) pay(s, choice.cost)
  const village = s.villages.find((v) => v.id === s.pendingVillageId) ?? null
  const note = choice.apply(s, { village })
  const base = { title: { key: `ev.${ev.id}.title` }, choice: { key: `ev.${ev.id}.c${choiceIndex}` } }
  if (note) log(s, 'log.eventNote', { ...base, note })
  else log(s, 'log.event', base)
  s.pendingEventId = null
  s.pendingVillageId = null
  addRes(s, {}) // перенормировать клампы
  return null
}

// перенести можно только свежую стройку, пока не прошёл ни один день с установки
export function canMove(s: GameState, b: Building): boolean {
  return s.status === 'playing' && !s.pendingEventId && !b.done && b.placedDay === s.day && s.day >= s.frozenUntil
}

// во сколько обойдётся перенос на клетку с заданной легальностью (delta < 0 значит возврат денег)
export function moveQuote(b: Building, legal: boolean) {
  const { money, days } = buildCost(b.type, legal)
  const fee = moveFee(b.paid)
  return { money, days, fee, delta: money + fee - b.paid }
}

export function moveBuilding(s: GameState, id: number, x: number, y: number): string | null {
  const b = s.buildings.find((v) => v.id === id)
  if (!b) return t('err.notFound')
  if (s.status !== 'playing') return t('err.gameOver')
  if (s.pendingEventId) return t('err.resolveEvent')
  if (s.day < s.frozenUntil) return t('err.frozen')
  if (b.done || b.placedDay !== s.day) return t('err.moveSameDay')
  if (x < 0 || y < 0 || x >= s.map.w || y >= s.map.h) return t('err.outOfMap')
  if (b.x === x && b.y === y) return t('err.sameCell')
  if (s.buildings.some((v) => v.x === x && v.y === y)) return t('err.cellTaken')

  const legal = s.map.legal[y * s.map.w + x]
  const q = moveQuote(b, legal)
  if (q.delta > 0 && !canAfford(s, { money: q.delta })) return t('err.needMoney', { n: q.delta })

  addRes(s, { money: -q.delta }) // за старое место возвращаем уплаченное, за новое берём цену и комиссию
  b.x = x
  b.y = y
  b.legal = legal
  b.daysLeft = q.days
  b.paid = q.money
  log(s, q.delta >= 0 ? 'log.movedPay' : 'log.movedRefund', { b: bName(b.type), n: Math.abs(q.delta) })
  return null
}

// заявка на разрешения: платим сейчас, разрешения приходят через несколько дней
export function requestPermits(s: GameState): string | null {
  if (s.status !== 'playing') return t('err.gameOver')
  if (s.pendingEventId) return t('err.resolveEvent')
  if (s.permitRequests.length >= PERMIT_REQUEST_MAX) return t('err.requestsFull', { n: PERMIT_REQUEST_MAX })
  const cost = { money: PERMIT_REQUEST_COST }
  if (!canAfford(s, cost)) return t('err.needMoney', { n: PERMIT_REQUEST_COST })
  pay(s, cost)
  s.permitRequests.push({ arriveDay: s.day + PERMIT_REQUEST_DAYS, gain: PERMIT_REQUEST_GAIN })
  log(s, 'log.requestSent', { n: PERMIT_REQUEST_DAYS })
  return null
}
