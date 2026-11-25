import type { GameState } from './types'

// mulberry32: состояние хранится в GameState, поэтому игру можно сохранять и воспроизводить
export function rand(s: Pick<GameState, 'rngState'>): number {
  s.rngState = (s.rngState + 0x6d2b79f5) | 0
  let t = s.rngState
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export const chance = (s: Pick<GameState, 'rngState'>, p: number) => rand(s) < p

export function weightedPick<T>(s: Pick<GameState, 'rngState'>, items: T[], weight: (t: T) => number): T | null {
  const ws = items.map(weight)
  const total = ws.reduce((a, b) => a + b, 0)
  if (total <= 0) return null
  let r = rand(s) * total
  for (let i = 0; i < items.length; i++) {
    r -= ws[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}
