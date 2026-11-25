import { PERMIT_REQUEST_COST, PERMIT_REQUEST_DAYS, PERMIT_REQUEST_GAIN, PERMIT_REQUEST_MAX } from '../data/balance'
import { BUILDINGS, buildCost, moveFee } from '../data/buildings'
import { EVENTS } from '../data/events'
import type { Building, BuildingType, GameState } from './types'
import { addRes, canAfford, log, pay } from './util'

// возвращает строку с ошибкой или null, если всё ок
export function build(s: GameState, type: BuildingType, x: number, y: number): string | null {
  if (s.status !== 'playing') return 'Игра окончена'
  if (s.pendingEventId) return 'Сначала решите событие'
  if (s.day < s.frozenUntil) return 'Стройка заморожена'
  if (x < 0 || y < 0 || x >= s.map.w || y >= s.map.h) return 'Вне карты'
  if (s.buildings.some((b) => b.x === x && b.y === y)) return 'Клетка занята'

  const legal = s.map.legal[y * s.map.w + x]
  const { money, days } = buildCost(type, legal)
  const cost = { money }
  if (!canAfford(s, cost)) return `Не хватает денег: нужно ${money}`

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
  const cost = { permits: 5, money: 60 }
  if (s.status !== 'playing') return 'Игра окончена'
  if (s.pendingEventId) return 'Сначала решите событие'
  if (!canAfford(s, cost)) return 'Не хватает разрешений или денег'
  pay(s, cost)
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++)
      if (x >= 0 && y >= 0 && x < s.map.w && y < s.map.h) s.map.legal[y * s.map.w + x] = true
  for (const b of s.buildings) if (s.map.legal[b.y * s.map.w + b.x]) b.legal = true
  log(s, 'Зона расширена, постройки внутри легализованы')
  return null
}

export function resolveEvent(s: GameState, choiceIndex: number): string | null {
  const ev = EVENTS.find((e) => e.id === s.pendingEventId)
  if (!ev) return 'Нет активного события'
  const choice = ev.choices[choiceIndex]
  if (!choice) return 'Нет такого варианта'
  if (choice.cost && !canAfford(s, choice.cost)) return 'Не хватает ресурсов'

  if (choice.cost) pay(s, choice.cost)
  const village = s.villages.find((v) => v.id === s.pendingVillageId) ?? null
  const note = choice.apply(s, { village })
  log(s, `${ev.title}: ${choice.label}${note ? ' — ' + note : ''}`)
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
  if (!b) return 'Постройка не найдена'
  if (s.status !== 'playing') return 'Игра окончена'
  if (s.pendingEventId) return 'Сначала решите событие'
  if (s.day < s.frozenUntil) return 'Стройка заморожена'
  if (b.done || b.placedDay !== s.day) return 'Переносить можно только в день установки'
  if (x < 0 || y < 0 || x >= s.map.w || y >= s.map.h) return 'Вне карты'
  if (b.x === x && b.y === y) return 'Это та же клетка'
  if (s.buildings.some((v) => v.x === x && v.y === y)) return 'Клетка занята'

  const legal = s.map.legal[y * s.map.w + x]
  const q = moveQuote(b, legal)
  if (q.delta > 0 && !canAfford(s, { money: q.delta })) return `Не хватает денег: нужно ${q.delta}`

  addRes(s, { money: -q.delta }) // за старое место возвращаем уплаченное, за новое берём цену и комиссию
  b.x = x
  b.y = y
  b.legal = legal
  b.daysLeft = q.days
  b.paid = q.money
  log(s, `${BUILDINGS[b.type].label} перенесён (${q.delta >= 0 ? 'доплата' : 'возврат'} ${Math.abs(q.delta)})`)
  return null
}

// заявка на разрешения: платим сейчас, разрешения приходят через несколько дней
export function requestPermits(s: GameState): string | null {
  if (s.status !== 'playing') return 'Игра окончена'
  if (s.pendingEventId) return 'Сначала решите событие'
  if (s.permitRequests.length >= PERMIT_REQUEST_MAX) return `Уже ${PERMIT_REQUEST_MAX} заявки в пути, дождитесь ответа`
  const cost = { money: PERMIT_REQUEST_COST }
  if (!canAfford(s, cost)) return `Не хватает денег: нужно ${PERMIT_REQUEST_COST}`
  pay(s, cost)
  s.permitRequests.push({ arriveDay: s.day + PERMIT_REQUEST_DAYS, gain: PERMIT_REQUEST_GAIN })
  log(s, `Подана заявка на разрешения, ответ через ${PERMIT_REQUEST_DAYS} дн.`)
  return null
}
