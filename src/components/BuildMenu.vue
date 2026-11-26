<script setup lang="ts">
import { requestPermits } from '../core/actions'
import { game } from '../core/store'
import type { BuildingType } from '../core/types'
import { fmt } from '../core/util'
import {
  GUARDPOST_UPKEEP, PERMIT_REQUEST_COST, PERMIT_REQUEST_DAYS, PERMIT_REQUEST_GAIN, PERMIT_REQUEST_MAX, SEC_POST,
  STORAGE_INCOME, ZONE_MONEY, ZONE_PERMITS,
} from '../data/balance'
import { BUILDINGS, MOVE_FEE_MIN, MOVE_FEE_RATIO, buildCost, illegalScrutiny } from '../data/buildings'
import { t } from '../i18n'
import Tip from './Tip.vue'

type Tool = BuildingType | 'zone'
const model = defineModel<Tool | null>({ required: true })
const emit = defineEmits<{ message: [text: string] }>()
const types = Object.keys(BUILDINGS) as BuildingType[]

const pick = (tool: Tool) => (model.value = model.value === tool ? null : tool)
const price = (tp: BuildingType, legal: boolean) => {
  const c = buildCost(tp, legal)
  return `${c.money} ${t('unit.money')} · ${c.days} ${t('unit.days')}`
}
const desc = (tp: BuildingType) =>
  t(`b.${tp}.desc`, { n: tp === 'storage' ? STORAGE_INCOME : fmt(SEC_POST), u: GUARDPOST_UPKEEP })
const apply = () => emit('message', requestPermits(game) ?? t('msg.requestSent'))
</script>

<template>
  <section class="menu">
    <div class="head">
      <h2>{{ t('m.build') }}</h2>
      <Tip placement="start">
        <template #default="{ toggle }">
          <button type="button" class="help" :aria-label="t('m.help.aria')" @click="toggle">?</button>
        </template>
        <template #content>
          <p>{{ t('m.help.p1') }}</p>
          <p>{{ t('m.help.p2', { n: fmt(illegalScrutiny(game.difficulty)) }) }}</p>
          <p>{{ t('m.help.p3', { pct: Math.round(MOVE_FEE_RATIO * 100), min: MOVE_FEE_MIN }) }}</p>
          <p class="dim">{{ t('m.help.p4') }}</p>
        </template>
      </Tip>
    </div>

    <Tip v-for="tp in types" :key="tp" block placement="start">
      <template #default="{ toggle }">
        <div class="card">
          <button class="tool" :class="{ on: model === tp }" @click="pick(tp)">
            <span class="name">{{ t(`b.${tp}.name`) }}</span>
            <span class="price">{{ t('m.inZone', { p: price(tp, true) }) }}</span>
            <span class="price out">{{ t('m.outZone', { p: price(tp, false) }) }}</span>
          </button>
          <button type="button" class="help info" :aria-label="t('m.info.aria')" @click="toggle">i</button>
        </div>
      </template>
      <template #content>
        <p><strong>{{ t(`b.${tp}.name`) }}</strong></p>
        <p>{{ desc(tp) }}</p>
        <p class="dim">{{ t('m.outNote', { n: fmt(illegalScrutiny(game.difficulty)) }) }}</p>
      </template>
    </Tip>

    <div class="head">
      <h2>{{ t('m.permits') }}</h2>
    </div>

    <Tip block placement="start">
      <template #default="{ toggle }">
        <div class="card">
          <button class="tool" :class="{ on: model === 'zone' }" @click="pick('zone')">
            <span class="name">{{ t('m.zone.name') }}</span>
            <span class="price">{{ t('m.zone.price', { p: ZONE_PERMITS, m: ZONE_MONEY }) }}</span>
          </button>
          <button type="button" class="help info" :aria-label="t('m.info.aria')" @click="toggle">i</button>
        </div>
      </template>
      <template #content>
        <p><strong>{{ t('m.zone.name') }}</strong></p>
        <p>{{ t('m.zone.p1') }}</p>
        <p class="dim">{{ t('m.zone.p2') }}</p>
      </template>
    </Tip>

    <Tip block placement="start">
      <template #default="{ toggle }">
        <div class="card">
          <button class="tool" @click="apply">
            <span class="name">{{ t('m.request.name') }}</span>
            <span class="price">{{ t('m.request.price', { n: PERMIT_REQUEST_COST, k: game.permitRequests.length }) }}</span>
          </button>
          <button type="button" class="help info" :aria-label="t('m.info.aria')" @click="toggle">i</button>
        </div>
      </template>
      <template #content>
        <p><strong>{{ t('m.request.name') }}</strong></p>
        <p>{{ t('m.request.p1', { g: PERMIT_REQUEST_GAIN, d: PERMIT_REQUEST_DAYS, max: PERMIT_REQUEST_MAX }) }}</p>
      </template>
    </Tip>
  </section>
</template>

<style scoped>
.menu { display: flex; flex-direction: column; gap: 8px; }
.head { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
h2 { margin: 0; font-size: 1rem; }
.card { position: relative; }
.tool { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; width: 100%; padding-block: 8px; padding-inline: 12px 40px; text-align: start; }
.tool.on { outline: 2px solid var(--line); background: #33403A; }
.name { font-weight: 600; }
.price { font-size: 0.8rem; color: var(--muted); }
.price.out { color: var(--line); }
.info { position: absolute; top: 8px; inset-inline-end: 8px; }
</style>
