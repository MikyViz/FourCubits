<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { settings } from '../core/settings'
import { game } from '../core/store'
import { diff } from '../data/difficulty'
import { t } from '../i18n'

const emit = defineEmits<{ start: []; settings: [] }>()
const startBtn = ref<HTMLButtonElement | null>(null)
onMounted(() => startBtn.value?.focus())
</script>

<template>
  <div class="overlay" @keydown.esc="emit('start')">
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="intro-title">
      <h2 id="intro-title">{{ t('intro.title') }}</h2>
      <p class="goal">{{ t('intro.goal', { n: diff(game).winPeople }) }}</p>

      <h3>{{ t('intro.pressure.title') }}</h3>
      <p>{{ t('intro.pressure') }}</p>

      <h3>{{ t('intro.how.title') }}</h3>
      <ul class="how">
        <li v-for="i in 5" :key="i">{{ t('intro.how' + i) }}</li>
      </ul>

      <p class="diff">{{ t('intro.difficulty', { d: t('diff.' + game.difficulty + '.name') }) }}</p>
      <label class="skip"><input v-model="settings.skipIntro" type="checkbox" /> {{ t('intro.skip') }}</label>

      <div class="actions">
        <button ref="startBtn" class="primary" @click="emit('start')">{{ t('intro.start') }}</button>
        <button @click="emit('settings')">{{ t('intro.settings') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.goal { font-size: 1.05rem; }
.how { margin: 0 0 8px; padding-inline-start: 20px; display: flex; flex-direction: column; gap: 4px; line-height: 1.45; }
.diff { margin-top: 12px; color: var(--line); }
.skip { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: var(--muted); cursor: pointer; }
.skip input { accent-color: var(--line); }
</style>
