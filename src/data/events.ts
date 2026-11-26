import { chance, rand } from '../core/rng'
import type { GameEvent, GameState, Msg } from '../core/types'
import { addRes, addScrutiny, clamp, countDone, illegalBuilt } from '../core/util'
import { diff } from './difficulty'

// Тексты событий лежат в словарях: ev.<id>.title / .text / .c0 .c1 ... (порядок вариантов = порядок в choices).
// apply возвращает пояснение для журнала в виде { key: 'note.…' }.

// чем лучше охрана, тем реже инциденты безопасности; сложность масштабирует вероятность
const sec = (s: GameState) => (1 - s.resources.security / 150) * diff(s).incidentMult

const note = (key: string, params?: Msg['params']): Msg => ({ key, params })

function removeRandomIllegal(s: GameState): boolean {
  const list = illegalBuilt(s)
  if (!list.length) return false
  const b = list[Math.floor(rand(s) * list.length)]
  s.buildings = s.buildings.filter((x) => x.id !== b.id)
  return true
}

const shiftAttitude = (v: { attitude: number } | null, d: number) => {
  if (v) v.attitude = clamp(v.attitude + d, -2, 2)
}

export const EVENTS: GameEvent[] = [
  // ───────── бюрократия ─────────
  {
    id: 'inspector',
    weight: (s) => 1 + s.buildings.length * 0.2 + s.scrutiny / 25,
    choices: [
      {
        apply: (s) => {
          const n = illegalBuilt(s).length
          if (!n) {
            addRes(s, { morale: 2 })
            return note('note.inspector.clean')
          }
          addRes(s, { money: -40 * n })
          addScrutiny(s, 5)
          return note('note.inspector.fine', { n })
        },
      },
      {
        cost: { permits: 1 },
        apply: (s) => {
          const n = illegalBuilt(s).length
          addRes(s, { money: -20 * n })
          return note(n ? 'note.inspector.halfFine' : 'note.inspector.wasted')
        },
      },
    ],
  },
  {
    id: 'freeze_order',
    weight: (s) => (illegalBuilt(s).length ? 0.5 + s.scrutiny / 20 : 0),
    choices: [
      {
        apply: (s) => {
          s.frozenUntil = s.day + 7
          addRes(s, { morale: -3 })
          return note('note.freeze7')
        },
      },
      {
        cost: { money: 80 },
        apply: (s) => {
          if (chance(s, 0.5)) {
            addScrutiny(s, 3)
            return note('note.freezeWon')
          }
          s.frozenUntil = s.day + 14
          return note('note.freezeLost')
        },
      },
    ],
  },
  {
    id: 'demolition',
    weight: (s) => (illegalBuilt(s).length && s.scrutiny > 30 ? (s.scrutiny - 30) / 20 : 0),
    choices: [
      {
        apply: (s) => {
          removeRandomIllegal(s)
          addRes(s, { morale: -6 })
          return note('note.demolished')
        },
      },
      {
        cost: { money: 100 },
        apply: (s) => {
          if (chance(s, 0.5)) {
            s.scrutiny = Math.max(0, s.scrutiny - 5)
            return note('note.reprieve')
          }
          removeRandomIllegal(s)
          addRes(s, { morale: -4 })
          return note('note.demolishedAfterAppeal')
        },
      },
    ],
  },
  {
    id: 'court_petition',
    weight: (s) => 0.1 + s.scrutiny / 50,
    choices: [
      {
        cost: { money: 70 },
        apply: (s) => {
          addRes(s, { permits: 2 })
          s.scrutiny = Math.max(0, s.scrutiny - 4)
          return note('note.permits2')
        },
      },
      {
        apply: (s) => {
          addScrutiny(s, 4)
        },
      },
    ],
  },
  {
    id: 'journalists',
    weight: (s) => 0.4 + s.scrutiny / 60,
    choices: [
      {
        apply: (s) => {
          if (s.resources.morale >= 55) {
            s.scrutiny = Math.max(0, s.scrutiny - 4)
            addRes(s, { morale: 3 })
            return note('note.reportGood')
          }
          addScrutiny(s, 6)
          addRes(s, { morale: -2 })
          return note('note.reportBad')
        },
      },
      {
        apply: (s) => {
          addScrutiny(s, 2)
        },
      },
    ],
  },

  // ───────── безопасность (привязаны к деревне) ─────────
  {
    id: 'spikes',
    needsVillage: true,
    weight: (s) => 1.2 * sec(s),
    choices: [
      { cost: { money: 20 }, apply: () => {} },
      {
        apply: (s) => {
          addRes(s, { morale: -2 })
          return note('note.lostTime')
        },
      },
      {
        cost: { money: 40 },
        apply: (s) => {
          addRes(s, { security: 3 })
        },
      },
      {
        cost: { money: 30 },
        apply: (s, ctx) => {
          shiftAttitude(ctx.village, 1)
          addRes(s, { morale: -1 })
          return note('note.relationsBetter')
        },
      },
    ],
  },
  {
    id: 'theft',
    needsVillage: true,
    weight: (s) => (countDone(s, 'storage') ? 1.0 * sec(s) : 0),
    choices: [
      {
        apply: (s) => {
          addRes(s, { money: -50 })
        },
      },
      {
        cost: { money: 15 },
        apply: (s) => {
          if (chance(s, 0.5)) {
            addRes(s, { money: -25 })
            return note('note.recoveredHalf')
          }
          addRes(s, { money: -50 })
          return note('note.nothingFound')
        },
      },
    ],
  },
  {
    id: 'stones',
    needsVillage: true,
    weight: (s) => 0.8 * sec(s),
    choices: [
      {
        cost: { money: 25 },
        apply: (s) => {
          addRes(s, { morale: -3 })
        },
      },
      {
        apply: (s) => {
          addRes(s, { morale: -6 })
        },
      },
      {
        cost: { money: 35 },
        apply: (s) => {
          addRes(s, { security: 4, morale: -1 })
        },
      },
    ],
  },
  {
    id: 'serious_incident',
    weight: (s) => 0.15 * sec(s),
    choices: [
      {
        cost: { money: 120 },
        apply: (s) => {
          addRes(s, { security: 15, morale: -8, people: -1 })
        },
      },
      {
        apply: (s) => {
          addRes(s, { morale: -14, people: -1 })
        },
      },
    ],
  },

  // ───────── позитивные ─────────
  {
    id: 'new_family',
    weight: (s) => (s.resources.morale >= 40 ? 1 : 0.2),
    choices: [
      {
        apply: (s) => {
          addRes(s, { people: 3, morale: 2 })
        },
      },
      { apply: () => {} },
    ],
  },
  {
    id: 'grant',
    weight: (s) => (s.resources.morale >= 50 ? 0.5 : 0),
    choices: [
      {
        apply: (s) => {
          addRes(s, { money: 150 })
          addScrutiny(s, 2)
          return note('note.grant150')
        },
      },
      {
        apply: (s) => {
          addRes(s, { morale: 2 })
        },
      },
    ],
  },
  {
    id: 'village_trade',
    needsVillage: true,
    weight: () => 0.6,
    choices: [
      {
        cost: { money: 20 },
        apply: (s, ctx) => {
          const a = ctx.village?.attitude ?? 0
          if (a >= 0 || chance(s, 0.4)) {
            addRes(s, { money: 80 })
            shiftAttitude(ctx.village, 1)
            return note('note.tradeOk')
          }
          return note('note.tradeFail')
        },
      },
      { apply: () => {} },
    ],
  },
]
