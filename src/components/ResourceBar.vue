<script setup lang="ts">
import { computed } from 'vue'
import { game } from '../core/store'
import { capacity, countDone, fmt, fmtSigned } from '../core/util'
import {
  MONEY_PER_PERSON, PERMIT_PASSIVE, PERMIT_REQUEST_COST, PERMIT_REQUEST_DAYS, PERMIT_REQUEST_GAIN, SEC_BASE,
  SEC_CRITICAL, SEC_LEAVE_EVERY, SEC_POST, ZONE_PERMITS,
} from '../data/balance'
import { illegalScrutiny } from '../data/buildings'
import { diff } from '../data/difficulty'
import { t } from '../i18n'
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
const perDay = (v: string) => t('rate.perDay', { v })

const items = computed(() => {
  const r = game.resources
  return [
    { key: 'people', value: `${Math.floor(r.people)} / ${capacity(game)}` },
    { key: 'money', value: String(Math.floor(r.money)), rate: perDay(fmtSigned(money.value.net, 0)), bad: r.money < 0, rateBad: money.value.net < 0 },
    {
      key: 'permits', value: String(Math.floor(r.permits)),
      rate: perDay(fmtSigned(PERMIT_PASSIVE)) + (incoming.value ? `, ${t('rate.inTransit', { v: fmtSigned(incoming.value, 0) })}` : ''),
    },
    {
      key: 'security', value: String(Math.round(r.security)),
      rate: perDay(fmtSigned(sec.value.net)) + (r.security < SEC_CRITICAL ? `, ${t('rate.leaving')}` : ''),
      bad: r.security < 20, rateBad: sec.value.net < 0,
    },
    { key: 'morale', value: String(Math.round(r.morale)), bad: r.morale < 25 },
    { key: 'scrutiny', value: String(Math.round(game.scrutiny)), bad: game.scrutiny > 60 },
  ]
})
</script>

<template>
  <header class="bar">
    <div class="brand">
      <img src="/favicon.svg" alt="" width="36" height="36" />
      <div class="brand-text">
        <span class="brand-name">FOUR CUBITS</span>
        <span class="brand-day">{{ t('ui.day', { n: game.day }) }}</span>
        <span v-if="frozen" class="frozen">{{ t('ui.frozen', { n: game.frozenUntil }) }}</span>
      </div>
    </div>
    <div class="stats">
      <Tip v-for="it in items" :key="it.key" pin-on-click placement="bottom">
        <div class="stat" :class="{ bad: it.bad }">
          <span class="label">{{ t('res.' + it.key) }}</span>
          <span class="value">{{ it.value }}</span>
          <span v-if="it.rate" class="rate" :class="{ neg: it.rateBad }">{{ it.rate }}</span>
        </div>

        <template #content>
          <template v-if="it.key === 'people'">
            <p><strong>{{ t('res.people') }}</strong></p>
            <p>{{ t('tip.people.p1', { m: MONEY_PER_PERSON, cap: capacity(game) }) }}</p>
            <p class="dim">{{ t('tip.people.p2', { n: diff(game).winPeople }) }}</p>
          </template>

          <template v-else-if="it.key === 'money'">
            <p><strong>{{ t('res.money') }}</strong> <span class="dim">{{ perDay(fmtSigned(money.net, 0)) }}</span></p>
            <div class="rows">
              <div><span class="k">{{ t('tip.money.people') }}</span><span class="v">{{ fmtSigned(money.people, 0)
                  }}</span></div>
              <div><span class="k">{{ t('tip.money.storage') }}</span><span class="v">{{ fmtSigned(money.storage, 0)
                  }}</span></div>
              <div><span class="k">{{ t('tip.money.upkeep') }}</span><span class="v">{{ fmtSigned(-money.upkeep, 0)
                  }}</span></div>
            </div>
            <p class="dim">{{ t('tip.money.note') }}</p>
          </template>

          <template v-else-if="it.key === 'permits'">
            <p><strong>{{ t('res.permits') }}</strong></p>
            <p>{{ t('tip.permits.p1', { n: ZONE_PERMITS }) }}</p>
            <div class="rows">
              <div><span class="k">{{ t('tip.permits.passive') }}</span><span class="v">{{
                perDay(fmtSigned(PERMIT_PASSIVE)) }}</span></div>
              <div>
                <span class="k">{{ t('tip.permits.request') }}</span>
                <span class="v">{{ t('tip.permits.requestVal', {
                  c: PERMIT_REQUEST_COST, um: t('unit.money'), g:
                    PERMIT_REQUEST_GAIN, d: PERMIT_REQUEST_DAYS, ud: t('unit.days')
                }) }}</span>
              </div>
              <div><span class="k">{{ t('tip.permits.events') }}</span><span class="v">{{ t('tip.permits.eventsVal')
                  }}</span></div>
            </div>
            <p v-if="nextPermit !== null" class="dim">{{ t('tip.permits.queue', {
              n: game.permitRequests.length, d:
                nextPermit
            }) }}</p>
          </template>

          <template v-else-if="it.key === 'security'">
            <p><strong>{{ t('res.security') }}</strong> <span class="dim">{{ perDay(fmtSigned(sec.net)) }}</span></p>
            <div class="rows">
              <div><span class="k">{{ t('tip.sec.guard', { base: fmt(SEC_BASE), post: fmt(SEC_POST), n: posts })
                  }}</span><span class="v">{{ fmtSigned(sec.regen) }}</span></div>
              <div><span class="k">{{ t('tip.sec.people') }}</span><span class="v">{{ fmtSigned(-sec.people) }}</span>
              </div>
              <div><span class="k">{{ t('tip.sec.border', { n: border }) }}</span><span class="v">{{
                fmtSigned(-sec.border) }}</span></div>
              <div><span class="k">{{ t('tip.sec.neighbors') }}</span><span class="v">{{ fmtSigned(-sec.neighbors)
                  }}</span></div>
            </div>
            <p>{{ t('tip.sec.p1') }}</p>
            <p class="dim">{{ t('tip.sec.p2', { crit: SEC_CRITICAL, days: SEC_LEAVE_EVERY }) }}</p>
          </template>

          <template v-else-if="it.key === 'morale'">
            <p><strong>{{ t('res.morale') }}</strong></p>
            <p>{{ t('tip.morale.p1') }}</p>
            <p class="dim">{{ t('tip.morale.p2') }}</p>
          </template>

          <template v-else>
            <p><strong>{{ t('res.scrutiny') }}</strong></p>
            <p>{{ t('tip.scrutiny.p1', { n: fmt(illegalScrutiny(game.difficulty)) }) }}</p>
            <p>{{ t('tip.scrutiny.p2') }}</p>
          </template>
        </template>
      </Tip>
    </div>
  </header>
</template>

<style scoped>
.bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 28px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--panel);
  border-bottom: 2px solid var(--line);
}

.day {
  display: flex;
  flex-direction: column;
}

.day-num {
  font-size: 1.25rem;
  font-weight: 700;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand img {
  flex: none;
}

.brand-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.brand-name {
  font-weight: 800;
  letter-spacing: 0.08em;
  font-size: 1.05rem;
  line-height: 1.2;
}

.brand-name::after {
  content: '';
  display: block;
  margin-top: 3px;
  border-top: 3px dashed var(--line);
}

.brand-day {
  font-size: 0.8rem;
  color: var(--muted);
}

.frozen {
  font-size: 0.8rem;
  color: var(--danger);
}

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
}

.stat {
  display: flex;
  flex-direction: column;
  min-width: 84px;
  padding: 2px 6px;
}

.label {
  font-size: 0.78rem;
  color: var(--muted);
  border-bottom: 1px dotted #55655b;
  align-self: flex-start;
}

.value {
  font-size: 1.1rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.stat.bad .value {
  color: var(--danger);
}

.rate {
  font-size: 0.74rem;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.rate.neg {
  color: var(--danger);
}
</style>
