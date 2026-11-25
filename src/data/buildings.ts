import type { BuildingType } from '../core/types'
import { fmt } from '../core/util'
import { GUARDPOST_UPKEEP, SEC_POST, STORAGE_INCOME, /* MARKET_INCOME */ } from './balance'

export interface BuildingDef {
  label: string
  description: string // что даёт постройка, показывается в меню
  cost: number // деньги
  days: number // время стройки
  illegalCostMult: number // дешевле вне зоны...
  illegalDaysMult: number // ...и быстрее, но растёт внимание
}

// сколько внимания проверяющих добавляется, когда здание достроено вне границ
export const ILLEGAL_SCRUTINY = 8

export const BUILDINGS: Record<BuildingType, BuildingDef> = {
  house: {
    label: 'Дом',
    description: 'Жильё: +4 места для жителей. Новые семьи приезжают, только пока есть свободные места. Больше людей: больше денег, но и больше нагрузка на безопасность.',
    cost: 120, days: 5, illegalCostMult: 0.6, illegalDaysMult: 0.5,
  },
  storage: {
    label: 'Склад',
    description: `Приносит +${STORAGE_INCOME} денег в день.`,
    cost: 80, days: 3, illegalCostMult: 0.6, illegalDaysMult: 0.5,
  },
  // market: {
  //   label: 'Магазин',
  //   description: `Продаёт товары жителям. Приносит доход +${MARKET_INCOME} в день.`,
  //   cost: 100, days: 4, illegalCostMult: 0.6, illegalDaysMult: 0.5,
  // },
  guardpost: {
    label: 'Пост охраны',
    description: `Восстанавливает безопасность: +${fmt(SEC_POST)} в день. Содержание: ${GUARDPOST_UPKEEP} денег в день.`,
    cost: 120, days: 5, illegalCostMult: 0.6, illegalDaysMult: 0.5,
  },
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
