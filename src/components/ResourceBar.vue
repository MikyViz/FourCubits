<script setup lang="ts">
import { computed } from 'vue'
import { game } from '../core/store'
import { capacity, countDone, fmt, fmtSigned } from '../core/util'
import {
  PERMIT_PASSIVE, PERMIT_REQUEST_COST, PERMIT_REQUEST_DAYS, PERMIT_REQUEST_GAIN, SEC_BASE, SEC_CRITICAL,
  SEC_LEAVE_EVERY, SEC_POST,
} from '../data/balance'
import { moneyBreakdown, securityBreakdown, zonePerimeter } from '../systems/economy'
import Tip from './Tip.vue'

const frozen = computed(() => game.day < game.frozenUntil)
const money = computed(() => moneyBreakdown(game))
const sec = computed(() => securityBreakdown(game))
const border = computed(() => zonePerimeter(game))
const posts = computed(() => countDone(game, 'guardpost'))
const incoming = computed(() => game.permitRequests.reduce((a, q) => a + q.gain, 0))
const nextPermit = computed(() =>
  game.permitRequests.length ? Math.min(...game.permitRequests.map((r) => r.arriveDay)) - game.day : null,
)

const items = computed(() => {
  const r = game.resources
  return [
    { key: 'people', label: 'Люди', value: `${Math.floor(r.people)} / ${capacity(game)}` },
    { key: 'money', label: 'Деньги', value: String(Math.floor(r.money)), rate: `${fmtSigned(money.value.net, 0)} в день`, bad: r.money < 0, rateBad: money.value.net < 0 },
    {
      key: 'permits', label: 'Разрешения', value: String(Math.floor(r.permits)),
      rate: `${fmtSigned(PERMIT_PASSIVE)} в день${incoming.value ? `, ${fmtSigned(incoming.value, 0)} в пути` : ''}`,
    },
    {
      key: 'security', label: 'Безопасность', value: String(Math.round(r.security)),
      rate: `${fmtSigned(sec.value.net)} в день${r.security < SEC_CRITICAL ? ', люди уезжают' : ''}`,
      bad: r.security < 20, rateBad: sec.value.net < 0,
    },
    { key: 'morale', label: 'Мораль', value: String(Math.round(r.morale)), bad: r.morale < 25 },
    { key: 'scrutiny', label: 'Внимание', value: String(Math.round(game.scrutiny)), bad: game.scrutiny > 60 },
  ]
})
</script>

<template>
  <header class="bar">
    <div class="day">
      <span class="day-num">День {{ game.day }}</span>
      <span v-if="frozen" class="frozen">стройка заморожена до дня {{ game.frozenUntil }}</span>
    </div>
    <div class="stats">
      <Tip v-for="it in items" :key="it.key" pin-on-click placement="bottom">
        <div class="stat" :class="{ bad: it.bad }">
          <span class="label">{{ it.label }}</span>
          <span class="value">{{ it.value }}</span>
          <span v-if="it.rate" class="rate" :class="{ neg: it.rateBad }">{{ it.rate }}</span>
        </div>

        <template #content>
          <template v-if="it.key === 'people'">
            <p><strong>Люди</strong></p>
            <p>Каждый приносит 1 ден. в день. Новая семья приезжает раз в 5 дней, пока есть свободные места в домах (сейчас {{ capacity(game) }}) и мораль выше 30.</p>
            <p>Чем больше людей, тем больше нагрузка на безопасность. Победа: 40 человек при морали от 40.</p>
          </template>

          <template v-else-if="it.key === 'money'">
            <p><strong>Деньги</strong> <span class="dim">{{ fmtSigned(money.net, 0) }} в день</span></p>
            <div class="rows">
              <div><span class="k">Жители</span><span class="v">{{ fmtSigned(money.people, 0) }}</span></div>
              <div><span class="k">Склады</span><span class="v">{{ fmtSigned(money.storage, 0) }}</span></div>
              <div><span class="k">Содержание постов</span><span class="v">{{ fmtSigned(-money.upkeep, 0) }}</span></div>
            </div>
            <p class="dim">Уходят на стройку, заявки, штрафы и события. Долг больше 200 означает поражение.</p>
          </template>

          <template v-else-if="it.key === 'permits'">
            <p><strong>Разрешения</strong></p>
            <p>Тратятся на расширение зоны (5 за раз). Откуда берутся:</p>
            <div class="rows">
              <div><span class="k">Сами копятся</span><span class="v">{{ fmtSigned(PERMIT_PASSIVE) }} в день</span></div>
              <div><span class="k">Заявка в меню</span><span class="v">{{ PERMIT_REQUEST_COST }} ден. → +{{ PERMIT_REQUEST_GAIN }} через {{ PERMIT_REQUEST_DAYS }} дн.</span></div>
              <div><span class="k">События</span><span class="v">иногда (юрист)</span></div>
            </div>
            <p v-if="nextPermit !== null" class="dim">В пути заявок: {{ game.permitRequests.length }}, ближайшая через {{ nextPermit }} дн.</p>
          </template>

          <template v-else-if="it.key === 'security'">
            <p><strong>Безопасность</strong> <span class="dim">{{ fmtSigned(sec.net) }} в день</span></p>
            <div class="rows">
              <div><span class="k">Охрана ({{ fmt(SEC_BASE) }} + {{ fmt(SEC_POST) }} за каждый из {{ posts }} постов)</span><span class="v">{{ fmtSigned(sec.regen) }}</span></div>
              <div><span class="k">Жители</span><span class="v">{{ fmtSigned(-sec.people) }}</span></div>
              <div><span class="k">Граница зоны ({{ border }} клеток)</span><span class="v">{{ fmtSigned(-sec.border) }}</span></div>
              <div><span class="k">Близость к деревням</span><span class="v">{{ fmtSigned(-sec.neighbors) }}</span></div>
            </div>
            <p>Расход растёт с числом жителей, длиной границы и близостью построек к деревням (враждебные считаются сильнее). Посты охраны восстанавливают запас.</p>
            <p class="dim">Чем ниже, тем чаще инциденты и ниже мораль. Ниже {{ SEC_CRITICAL }} семьи уезжают: минус 1 человек каждые {{ SEC_LEAVE_EVERY }} дня.</p>
          </template>

          <template v-else-if="it.key === 'morale'">
            <p><strong>Мораль</strong></p>
            <p>Каждый день на 1 тянется к уровню, который зависит от безопасности (выше лучше) и внимания проверяющих (больше хуже).</p>
            <p class="dim">Ниже 30 новые семьи не приезжают. При 0 поселение не выдерживает.</p>
          </template>

          <template v-else>
            <p><strong>Внимание</strong></p>
            <p>Растёт, когда достроено здание вне границ (+8), и от некоторых событий. Медленно спадает: −0,3 в день.</p>
            <p>Чем выше, тем чаще проверки, приказы о заморозке и сносе, иски. Выше 60 опасно. Расширение зоны легализует постройки внутри.</p>
          </template>
        </template>
      </Tip>
    </div>
  </header>
</template>

<style scoped>
.bar { display: flex; flex-wrap: wrap; gap: 12px 28px; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--panel); border-bottom: 2px solid var(--line); }
.day { display: flex; flex-direction: column; }
.day-num { font-size: 1.25rem; font-weight: 700; }
.frozen { font-size: 0.8rem; color: var(--danger); }
.stats { display: flex; flex-wrap: wrap; gap: 8px 14px; }
.stat { display: flex; flex-direction: column; min-width: 84px; padding: 2px 6px; }
.label { font-size: 0.78rem; color: var(--muted); border-bottom: 1px dotted #55655b; align-self: flex-start; }
.value { font-size: 1.1rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.stat.bad .value { color: var(--danger); }
.rate { font-size: 0.74rem; color: var(--muted); font-variant-numeric: tabular-nums; }
.rate.neg { color: var(--danger); }
</style>
