import { DIFFICULTY } from '../data/difficulty'
import { lang } from '../i18n'
import type { BuildingType, GameState, Param, Resources } from './types'

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

const keys = (o: object) => Object.keys(o) as (keyof Resources)[]

export function addRes(s: GameState, d: Partial<Resources>) {
  for (const k of keys(d)) s.resources[k] += d[k] ?? 0
  const r = s.resources
  r.security = clamp(r.security, 0, 100)
  r.morale = clamp(r.morale, 0, 100)
  r.people = Math.max(0, r.people)
  r.permits = Math.max(0, r.permits)
}

// рост внимания проверяющих зависит от сложности; уменьшение не масштабируется
export function addScrutiny(s: GameState, n: number) {
  s.scrutiny += n > 0 ? n * DIFFICULTY[s.difficulty].scrutinyMult : n
}

export const canAfford = (s: GameState, cost: Partial<Resources>) =>
  keys(cost).every((k) => s.resources[k] >= (cost[k] ?? 0))

export function pay(s: GameState, cost: Partial<Resources>) {
  const neg: Partial<Resources> = {}
  for (const k of keys(cost)) neg[k] = -(cost[k] ?? 0)
  addRes(s, neg)
}

// запись журнала хранится как ключ + параметры и переводится при показе, поэтому язык можно менять на лету
export function log(s: GameState, key: string, params?: Record<string, Param>) {
  s.log.unshift({ day: s.day, msg: { key, params } })
  if (s.log.length > 50) s.log.pop()
}

export const illegalBuilt = (s: GameState) => s.buildings.filter((b) => b.done && !b.legal)
export const countDone = (s: GameState, t: BuildingType) => s.buildings.filter((b) => b.done && b.type === t).length
export const capacity = (s: GameState) => 6 + 4 * countDone(s, 'house')

// 1.5 -> «1,5» по-русски и «1.5» иначе; со знаком: +1.5 / −0.4
export const fmt = (n: number, d = 1) => n.toFixed(d).replace('.', lang.value === 'ru' ? ',' : '.')
// \u200E (LRM) удерживает знак слева от числа в иврите, в остальных языках невидим
export const fmtSigned = (n: number, d = 1) => '\u200E' + (n >= 0 ? '+' : '−') + fmt(Math.abs(n), d)
