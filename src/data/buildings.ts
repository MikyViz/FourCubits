import type { BuildingType, Difficulty } from '../core/types'
import { DIFFICULTY } from './difficulty'

// названия и описания лежат в словарях: b.<type>.name, b.<type>.desc
export interface BuildingDef {
  cost: number // деньги
  days: number // время стройки
  illegalCostMult: number // дешевле вне зоны...
  illegalDaysMult: number // ...и быстрее, но растёт внимание
}

// сколько внимания проверяющих добавляется (до множителя сложности), когда здание достроено вне границ
export const ILLEGAL_SCRUTINY = 8
export const illegalScrutiny = (d: Difficulty) => Math.round(ILLEGAL_SCRUTINY * DIFFICULTY[d].scrutinyMult * 10) / 10

export const BUILDINGS: Record<BuildingType, BuildingDef> = {
  house: { cost: 120, days: 5, illegalCostMult: 0.6, illegalDaysMult: 0.5 },
  storage: { cost: 80, days: 3, illegalCostMult: 0.6, illegalDaysMult: 0.5 },
  guardpost: { cost: 120, days: 5, illegalCostMult: 0.6, illegalDaysMult: 0.5 },
}

// единственное место, где считается цена и срок: используют и стройка, и интерфейс
export function buildCost(type: BuildingType, legal: boolean): { money: number; days: number } {
  const d = BUILDINGS[type]
  return {
    money: Math.ceil(d.cost * (legal ? 1 : d.illegalCostMult)),
    days: Math.max(1, Math.ceil(d.days * (legal ? 1 : d.illegalDaysMult))),
  }
}

// перенос стройки: комиссия от уплаченной суммы, возможен только в день установки
export const MOVE_FEE_RATIO = 0.2
export const MOVE_FEE_MIN = 5
export const moveFee = (paid: number) => Math.max(MOVE_FEE_MIN, Math.ceil(paid * MOVE_FEE_RATIO))
