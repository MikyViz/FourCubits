<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import BuildMenu from './components/BuildMenu.vue'
import EventModal from './components/EventModal.vue'
import MapCanvas from './components/MapCanvas.vue'
import ResourceBar from './components/ResourceBar.vue'
import Tip from './components/Tip.vue'
import { game, resetGame } from './core/store'
import { tick } from './core/tick'
import type { BuildingType } from './core/types'

const tool = ref<BuildingType | 'zone' | null>(null)
const message = ref('')
const auto = ref(false)
let timer: number | undefined

function stopAuto() {
  auto.value = false
  window.clearInterval(timer)
}

function toggleAuto() {
  if (auto.value) return stopAuto()
  auto.value = true
  timer = window.setInterval(() => {
    tick(game)
    if (game.status !== 'playing') stopAuto()
  }, 700)
}

function restart() {
  stopAuto()
  tool.value = null
  message.value = ''
  resetGame()
}

onBeforeUnmount(stopAuto)
</script>

<template>
  <div class="app">
    <ResourceBar />
    <main class="main">
      <section class="board">
        <MapCanvas :tool="tool" @message="message = $event" />
        <div class="under">
          <p class="msg" aria-live="polite">{{ message }}</p>
          <Tip placement="top" pin-on-click>
            <span class="legend-btn">Что на карте?</span>
            <template #content>
              <p><strong>Обозначения</strong></p>
              <ul class="legend">
                <li><b class="dash">Жёлтый пунктир</b>: граница разрешённой зоны. Внутри строить по полной цене, снаружи дешевле, но растёт внимание.</li>
                <li><b>«!» на здании</b>: построено вне зоны и привлекает проверяющих. Расширение зоны его легализует.</li>
                <li><b>Белый пунктир вокруг здания</b>: его ещё можно перенести (перетащить на другую клетку) до следующего дня.</li>
                <li><b>Число на недостроенном</b>: сколько дней осталось до конца стройки.</li>
                <li><b>Цветная точка у деревни</b>: отношение к вам (красная враждебная, серая нейтральная, зелёная дружелюбная). Постройки рядом с деревней увеличивают расход безопасности.</li>
              </ul>
              <p class="dim">Подсказки на всём интерфейсе: наведите курсор или нажмите.</p>
            </template>
          </Tip>
        </div>
      </section>
      <aside class="side">
        <div class="controls">
          <button
            :disabled="!!game.pendingEventId || game.status !== 'playing'"
            title="Перейти к следующему дню"
            @click="tick(game)"
          >
            Следующий день
          </button>
          <button
            :class="{ on: auto }"
            :disabled="game.status !== 'playing'"
            title="Дни идут сами каждые 0,7 с, пока не случится событие"
            @click="toggleAuto"
          >
            {{ auto ? 'Пауза' : 'Авто' }}
          </button>
        </div>
        <BuildMenu v-model="tool" @message="message = $event" />
        <section class="log">
          <h2>Журнал</h2>
          <ul>
            <li v-for="(l, i) in game.log" :key="i">{{ l }}</li>
          </ul>
        </section>
      </aside>
    </main>

    <EventModal @message="message = $event" />

    <div v-if="game.status !== 'playing'" class="backdrop">
      <div class="end">
        <h2>{{ game.status === 'won' ? 'Поселение устояло' : 'Поселение не выдержало' }}</h2>
        <p>Дней прошло: {{ game.day }}</p>
        <button @click="restart">Начать заново</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app { min-height: 100vh; }
.main { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 16px; padding: 16px; align-items: start; }
.board { min-width: 0; }
.under { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 8px; }
.msg { min-height: 1.4em; margin: 0; color: var(--line); }
.legend-btn { font-size: 0.85rem; color: var(--muted); border-bottom: 1px dotted #55655b; white-space: nowrap; }
.legend { margin: 0 0 6px; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; }
.legend .dash { color: var(--line); }
.side { display: flex; flex-direction: column; gap: 16px; }
.controls { display: flex; gap: 8px; }
.controls button { flex: 1; padding: 10px 12px; }
.controls .on { outline: 2px solid var(--line); }
.log h2 { margin: 0 0 6px; font-size: 1rem; }
.log ul { list-style: none; margin: 0; padding: 0; max-height: 240px; overflow-y: auto; font-size: 0.85rem; display: flex; flex-direction: column; gap: 4px; }
.log li { color: var(--muted); }
.log li:first-child { color: var(--text); }
.backdrop { position: fixed; inset: 0; display: grid; place-items: center; background: rgba(10, 14, 12, 0.75); z-index: 20; padding: 16px; }
.end { background: var(--panel); border: 2px solid var(--line); padding: 24px; text-align: center; }
.end h2 { margin: 0 0 8px; }
@media (max-width: 800px) { .main { grid-template-columns: 1fr; } }
</style>
