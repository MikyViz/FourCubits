<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import BuildMenu from './components/BuildMenu.vue'
import EventModal from './components/EventModal.vue'
import IntroModal from './components/IntroModal.vue'
import MapCanvas from './components/MapCanvas.vue'
import ResourceBar from './components/ResourceBar.vue'
import SettingsModal from './components/SettingsModal.vue'
import Tip from './components/Tip.vue'
import { settings } from './core/settings'
import { game, resetGame } from './core/store'
import { tick } from './core/tick'
import type { BuildingType } from './core/types'
import { applyDirection, lang, t, tm } from './i18n'

const tool = ref<BuildingType | 'zone' | null>(null)
const message = ref('')
const auto = ref(false)
const showIntro = ref(!settings.skipIntro)
const showSettings = ref(false)
let timer: number | undefined

// язык и направление текста (иврит справа налево) применяются сразу и при каждой смене
watch(lang, applyDirection, { immediate: true })

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
  showSettings.value = false
  resetGame(settings.difficulty)
}

// пока открыто окно, время не идёт
watch([showIntro, showSettings], ([a, b]) => {
  if (a || b) stopAuto()
})

// пока партия не началась, смена сложности применяется сразу
watch(
  () => settings.difficulty,
  (d) => {
    if (game.day === 0 && game.buildings.length === 0) resetGame(d)
  },
)

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
            <span class="legend-btn">{{ t('ui.legendBtn') }}</span>
            <template #content>
              <p><strong>{{ t('legend.title') }}</strong></p>
              <ul class="legend">
                <li v-for="i in 5" :key="i">
                  <b :class="{ dash: i === 1 }">{{ t('legend.k' + i) }}</b>: {{ t('legend.v' + i) }}
                </li>
              </ul>
              <p class="dim">{{ t('legend.hint') }}</p>
            </template>
          </Tip>
        </div>
      </section>
      <aside class="side">
        <div class="controls">
          <button :disabled="!!game.pendingEventId || game.status !== 'playing'" :title="t('ui.nextDay.title')" @click="tick(game)">
            {{ t('ui.nextDay') }}
          </button>
          <button :class="{ on: auto }" :disabled="game.status !== 'playing'" :title="t('ui.auto.title')" @click="toggleAuto">
            {{ auto ? t('ui.pause') : t('ui.auto') }}
          </button>
        </div>
        <div class="controls">
          <button @click="showIntro = true">{{ t('ui.goal') }}</button>
          <button @click="showSettings = true">{{ t('ui.settings') }}</button>
        </div>
        <BuildMenu v-model="tool" @message="message = $event" />
        <section class="log">
          <h2>{{ t('ui.log') }}</h2>
          <ul>
            <li v-for="(l, i) in game.log" :key="i">{{ t('log.prefix', { n: l.day }) }} {{ tm(l.msg) }}</li>
          </ul>
        </section>
      </aside>
    </main>

    <EventModal @message="message = $event" />

    <div v-if="game.status !== 'playing'" class="backdrop">
      <div class="end">
        <h2>{{ game.status === 'won' ? t('end.won') : t('end.lost') }}</h2>
        <p>{{ t('end.days', { n: game.day }) }}</p>
        <button @click="restart">{{ t('end.restart') }}</button>
      </div>
    </div>

    <IntroModal v-if="showIntro" @start="showIntro = false" @settings="showSettings = true" />
    <SettingsModal v-if="showSettings" @close="showSettings = false" @restart="restart" />
  </div>
</template>

<style scoped>
.app { min-height: 100vh; }
.main { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 16px; padding: 16px; align-items: start; }
.board { min-width: 0; }
.under { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 8px; }
.msg { min-height: 1.4em; margin: 0; color: var(--line); }
.legend-btn { font-size: 0.85rem; color: var(--muted); border-bottom: 1px dotted #55655b; white-space: nowrap; }
.legend { margin: 0 0 6px; padding-inline-start: 18px; display: flex; flex-direction: column; gap: 4px; }
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
