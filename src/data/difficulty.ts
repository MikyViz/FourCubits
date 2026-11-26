import type { Difficulty, GameState } from '../core/types'

export interface DifficultyDef {
  startMoney: number
  startPermits: number
  startSecurity: number
  eventChance: number // шанс события в день
  incidentMult: number // множитель вероятности инцидентов безопасности
  scrutinyMult: number // множитель прироста внимания проверяющих
  securityLoad: number // множитель расхода безопасности
  winPeople: number // сколько жителей нужно для победы
}

export const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard']

export const DIFFICULTY: Record<Difficulty, DifficultyDef> = {
  easy: { startMoney: 400, startPermits: 8, startSecurity: 50, eventChance: 0.28, incidentMult: 0.6, scrutinyMult: 0.7, securityLoad: 0.8, winPeople: 30 },
  normal: { startMoney: 300, startPermits: 5, startSecurity: 40, eventChance: 0.35, incidentMult: 1, scrutinyMult: 1, securityLoad: 1, winPeople: 40 },
  hard: { startMoney: 200, startPermits: 3, startSecurity: 30, eventChance: 0.5, incidentMult: 1.8, scrutinyMult: 1.6, securityLoad: 1.45, winPeople: 60 },
}

export const diff = (s: GameState): DifficultyDef => DIFFICULTY[s.difficulty]
