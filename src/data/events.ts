import { chance, rand } from '../core/rng'
import type { GameEvent, GameState } from '../core/types'
import { addRes, clamp, countDone, illegalBuilt, log } from '../core/util'

// чем лучше охрана, тем реже инциденты безопасности
const sec = (s: GameState) => 1 - s.resources.security / 150

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
    title: 'Проверка границ',
    text: 'Приехал инспектор с рулеткой и планом. Проверяет каждый метр.',
    weight: (s) => 1 + s.buildings.length * 0.2 + s.scrutiny / 25,
    choices: [
      {
        label: 'Принять проверку',
        apply: (s) => {
          const n = illegalBuilt(s).length
          if (!n) {
            addRes(s, { morale: 2 })
            return 'нарушений нет'
          }
          addRes(s, { money: -40 * n })
          s.scrutiny += 5
          return `штраф за ${n} нарушений`
        },
      },
      {
        label: 'Затянуть через бумаги',
        cost: { permits: 1 },
        apply: (s) => {
          const n = illegalBuilt(s).length
          addRes(s, { money: -20 * n })
          return n ? 'штраф вдвое меньше' : 'проверка прошла впустую'
        },
      },
    ],
  },
  {
    id: 'freeze_order',
    title: 'Приказ о приостановке стройки',
    text: 'Пришло предписание: все работы заморожены до разбирательства.',
    weight: (s) => (illegalBuilt(s).length ? 0.5 + s.scrutiny / 20 : 0),
    choices: [
      {
        label: 'Подчиниться',
        apply: (s) => {
          s.frozenUntil = s.day + 7
          addRes(s, { morale: -3 })
          return 'стройка стоит 7 дней'
        },
      },
      {
        label: 'Оспорить (адвокат)',
        cost: { money: 80 },
        apply: (s) => {
          if (chance(s, 0.5)) {
            s.scrutiny += 3
            return 'суд отклонил приказ'
          }
          s.frozenUntil = s.day + 14
          return 'проиграли, стройка стоит 14 дней'
        },
      },
    ],
  },
  {
    id: 'demolition',
    title: 'Приказ о сносе',
    text: 'Постройка вне границ признана нарушением. Назначен снос.',
    weight: (s) => (illegalBuilt(s).length && s.scrutiny > 30 ? (s.scrutiny - 30) / 20 : 0),
    choices: [
      {
        label: 'Принять',
        apply: (s) => {
          removeRandomIllegal(s)
          addRes(s, { morale: -6 })
          return 'здание снесено'
        },
      },
      {
        label: 'Оспорить в суде',
        cost: { money: 100 },
        apply: (s) => {
          if (chance(s, 0.5)) {
            s.scrutiny = Math.max(0, s.scrutiny - 5)
            return 'отсрочка получена'
          }
          removeRandomIllegal(s)
          addRes(s, { morale: -4 })
          return 'суд проигран, здание снесено'
        },
      },
    ],
  },
  {
    id: 'court_petition',
    title: 'Петиция против поселения',
    text: 'Организация подала иск о незаконности части застройки.',
    weight: (s) => 0.1 + s.scrutiny / 50,
    choices: [
      {
        label: 'Нанять юриста',
        cost: { money: 70 },
        apply: (s) => {
          addRes(s, { permits: 2 })
          s.scrutiny = Math.max(0, s.scrutiny - 4)
          return '+2 разрешения'
        },
      },
      {
        label: 'Игнорировать',
        apply: (s) => {
          s.scrutiny += 4
        },
      },
    ],
  },
  {
    id: 'journalists',
    title: 'Журналисты',
    text: 'Съёмочная группа приехала снимать репортаж о поселении.',
    weight: (s) => 0.4 + s.scrutiny / 60,
    choices: [
      {
        label: 'Открыть двери',
        apply: (s) => {
          if (s.resources.morale >= 55) {
            s.scrutiny = Math.max(0, s.scrutiny - 4)
            addRes(s, { morale: 3 })
            return 'репортаж вышел в вашу пользу'
          }
          s.scrutiny += 6
          addRes(s, { morale: -2 })
          return 'репортаж получился неудачным'
        },
      },
      {
        label: 'Отказаться от интервью',
        apply: (s) => {
          s.scrutiny += 2
        },
      },
    ],
  },

  // ───────── безопасность (привязаны к деревне) ─────────
  {
    id: 'spikes',
    title: 'Шипы на дороге',
    text: 'Возле деревни «{village}» на дороге нашли шипы. Колёса пробиты.',
    needsVillage: true,
    weight: (s) => 1.2 * sec(s),
    choices: [
      { label: 'Починить и ехать дальше', cost: { money: 20 }, apply: () => {} },
      {
        label: 'Добираться как есть',
        apply: (s) => {
          addRes(s, { morale: -2 })
          return 'потеряли время'
        },
      },
      {
        label: 'Организовать патруль',
        cost: { money: 40 },
        apply: (s) => {
          addRes(s, { security: 3 })
        },
      },
      {
        label: 'Поговорить со старостой',
        cost: { money: 30 },
        apply: (s, ctx) => {
          shiftAttitude(ctx.village, 1)
          addRes(s, { morale: -1 })
          return 'отношения немного улучшились'
        },
      },
    ],
  },
  {
    id: 'theft',
    title: 'Кража со склада',
    text: 'Ночью со склада пропали припасы. Следы ведут в сторону деревни «{village}».',
    needsVillage: true,
    weight: (s) => (countDone(s, 'storage') ? 1.0 * sec(s) : 0),
    choices: [
      {
        label: 'Списать убыток',
        apply: (s) => {
          addRes(s, { money: -50 })
        },
      },
      {
        label: 'Организовать поиск',
        cost: { money: 15 },
        apply: (s) => {
          if (chance(s, 0.5)) {
            addRes(s, { money: -25 })
            return 'вернули половину'
          }
          addRes(s, { money: -50 })
          return 'ничего не нашли'
        },
      },
    ],
  },
  {
    id: 'stones',
    title: 'Камни по машинам',
    text: 'Возле деревни «{village}» по проезжающей машине бросили камни.',
    needsVillage: true,
    weight: (s) => 0.8 * sec(s),
    choices: [
      {
        label: 'Заменить стёкла',
        cost: { money: 25 },
        apply: (s) => {
          addRes(s, { morale: -3 })
        },
      },
      {
        label: 'Не реагировать',
        apply: (s) => {
          addRes(s, { morale: -6 })
        },
      },
      {
        label: 'Усилить охрану дороги',
        cost: { money: 35 },
        apply: (s) => {
          addRes(s, { security: 4, morale: -1 })
        },
      },
    ],
  },
  {
    id: 'serious_incident',
    title: 'Тяжёлый инцидент',
    text: 'Произошёл серьёзный инцидент безопасности. Есть пострадавшие.',
    weight: (s) => 0.15 * sec(s),
    choices: [
      {
        label: 'Усилить защиту',
        cost: { money: 120 },
        apply: (s) => {
          addRes(s, { security: 15, morale: -8, people: -1 })
        },
      },
      {
        label: 'Сохранить курс',
        apply: (s) => {
          addRes(s, { morale: -14, people: -1 })
        },
      },
    ],
  },

  // ───────── позитивные ─────────
  {
    id: 'new_family',
    title: 'Новая семья',
    text: 'Семья хочет переехать к вам.',
    weight: (s) => (s.resources.morale >= 40 ? 1 : 0.2),
    choices: [
      {
        label: 'Принять',
        apply: (s) => {
          addRes(s, { people: 3, morale: 2 })
        },
      },
      { label: 'Пока нет места', apply: () => {} },
    ],
  },
  {
    id: 'grant',
    title: 'Грант от спонсора',
    text: 'Фонд готов профинансировать развитие, но ждёт отчёта.',
    weight: (s) => (s.resources.morale >= 50 ? 0.5 : 0),
    choices: [
      {
        label: 'Принять',
        apply: (s) => {
          addRes(s, { money: 150 })
          s.scrutiny += 2
          return '+150 денег'
        },
      },
      {
        label: 'Отказаться',
        apply: (s) => {
          addRes(s, { morale: 2 })
        },
      },
    ],
  },
  {
    id: 'village_trade',
    title: 'Торговое предложение',
    text: 'Купцы из деревни «{village}» предлагают обмен товарами.',
    needsVillage: true,
    weight: () => 0.6,
    choices: [
      {
        label: 'Согласиться',
        cost: { money: 20 },
        apply: (s, ctx) => {
          const a = ctx.village?.attitude ?? 0
          if (a >= 0 || chance(s, 0.4)) {
            addRes(s, { money: 80 })
            shiftAttitude(ctx.village, 1)
            return 'сделка выгодна, отношения лучше'
          }
          log(s, 'Сделка сорвалась')
          return 'сделка сорвалась'
        },
      },
      { label: 'Отказаться', apply: () => {} },
    ],
  },
]
