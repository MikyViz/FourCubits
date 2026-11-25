<script setup lang="ts">
import { requestPermits } from '../core/actions'
import { game } from '../core/store'
import { PERMIT_REQUEST_COST, PERMIT_REQUEST_DAYS, PERMIT_REQUEST_GAIN, PERMIT_REQUEST_MAX } from '../data/balance'
import { BUILDINGS, ILLEGAL_SCRUTINY, MOVE_FEE_MIN, MOVE_FEE_RATIO, buildCost } from '../data/buildings'
import type { BuildingType } from '../core/types'
import Tip from './Tip.vue'

type Tool = BuildingType | 'zone'
const model = defineModel<Tool | null>({ required: true })
const emit = defineEmits<{ message: [text: string] }>()
const types = Object.keys(BUILDINGS) as BuildingType[]

const pick = (t: Tool) => (model.value = model.value === t ? null : t)
const price = (t: BuildingType, legal: boolean) => {
  const c = buildCost(t, legal)
  return `${c.money} ден. · ${c.days} дн.`
}
const apply = () => emit('message', requestPermits(game) ?? 'Заявка подана')
</script>

<template>
  <section class="menu">
    <div class="head">
      <h2>Строить</h2>
      <Tip placement="left">
        <template #default="{ toggle }">
          <button type="button" class="help" aria-label="Как строить" @click="toggle">?</button>
        </template>
        <template #content>
          <p>Выберите постройку и кликните по карте. Повторный клик по кнопке снимает выбор.</p>
          <p>Клетка внутри пунктира строится по полной цене. Снаружи дешевле и быстрее, но по завершении добавляется +{{ ILLEGAL_SCRUTINY }} внимания. Цена и срок для клетки под курсором видны на карте.</p>
          <p>Только что поставленную стройку можно перетащить на другую клетку, пока не наступил следующий день. Комиссия {{ Math.round(MOVE_FEE_RATIO * 100) }}% от цены, не меньше {{ MOVE_FEE_MIN }}; разница в цене клеток пересчитывается.</p>
          <p class="dim">Нажмите «i» у постройки, чтобы узнать, что она даёт.</p>
        </template>
      </Tip>
    </div>

    <Tip v-for="t in types" :key="t" block placement="left">
      <template #default="{ toggle }">
        <div class="card">
          <button class="tool" :class="{ on: model === t }" @click="pick(t)">
            <span class="name">{{ BUILDINGS[t].label }}</span>
            <span class="price">В зоне: {{ price(t, true) }}</span>
            <span class="price out">Вне зоны: {{ price(t, false) }}</span>
          </button>
          <button type="button" class="help info" aria-label="Подробнее" @click="toggle">i</button>
        </div>
      </template>
      <template #content>
        <p><strong>{{ BUILDINGS[t].label }}</strong></p>
        <p>{{ BUILDINGS[t].description }}</p>
        <p class="dim">Вне зоны дешевле и быстрее, но по завершении +{{ ILLEGAL_SCRUTINY }} внимания.</p>
      </template>
    </Tip>

    <div class="head">
      <h2>Разрешения</h2>
    </div>

    <Tip block placement="left">
      <template #default="{ toggle }">
        <div class="card">
          <button class="tool" :class="{ on: model === 'zone' }" @click="pick('zone')">
            <span class="name">Расширить зону</span>
            <span class="price">5 разрешений + 60 ден.</span>
          </button>
          <button type="button" class="help info" aria-label="Подробнее" @click="toggle">i</button>
        </div>
      </template>
      <template #content>
        <p><strong>Расширить зону</strong></p>
        <p>Квадрат 5×5 вокруг выбранной клетки становится разрешённым, постройки в нём легализуются (пропадает «!»).</p>
        <p class="dim">Граница становится длиннее, а с ней растёт расход безопасности.</p>
      </template>
    </Tip>

    <Tip block placement="left">
      <template #default="{ toggle }">
        <div class="card">
          <button class="tool" @click="apply">
            <span class="name">Подать заявку</span>
            <span class="price">{{ PERMIT_REQUEST_COST }} ден. · в пути: {{ game.permitRequests.length }}</span>
          </button>
          <button type="button" class="help info" aria-label="Подробнее" @click="toggle">i</button>
        </div>
      </template>
      <template #content>
        <p><strong>Заявка на разрешения</strong></p>
        <p>+{{ PERMIT_REQUEST_GAIN }} разрешения через {{ PERMIT_REQUEST_DAYS }} дн. Деньги уходят сразу. В пути может быть до {{ PERMIT_REQUEST_MAX }} заявок.</p>
      </template>
    </Tip>
  </section>
</template>

<style scoped>
.menu { display: flex; flex-direction: column; gap: 8px; }
.head { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
h2 { margin: 0; font-size: 1rem; }
.card { position: relative; }
.tool { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; width: 100%; padding: 8px 40px 8px 12px; text-align: left; }
.tool.on { outline: 2px solid var(--line); background: #33403A; }
.name { font-weight: 600; }
.price { font-size: 0.8rem; color: var(--muted); }
.price.out { color: var(--line); }
.info { position: absolute; top: 8px; right: 8px; }
</style>
