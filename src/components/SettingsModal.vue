<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { settings } from '../core/settings'
import { game } from '../core/store'
import { DIFFICULTIES, DIFFICULTY } from '../data/difficulty'
import { LANGS, lang, setLang, t } from '../i18n'

const emit = defineEmits<{ close: []; restart: [] }>()
const closeBtn = ref<HTMLButtonElement | null>(null)
onMounted(() => closeBtn.value?.focus())

// выбранная сложность отличается от сложности идущей партии
const pending = computed(() => settings.difficulty !== game.difficulty)
</script>

<template>
  <div class="overlay" @keydown.esc="emit('close')">
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <h2 id="settings-title">{{ t('settings.title') }}</h2>

      <fieldset>
        <legend>{{ t('settings.language') }}</legend>
        <div class="group langs">
          <label v-for="l in LANGS" :key="l.code" class="opt" :class="{ on: lang === l.code }">
            <input type="radio" name="lang" :value="l.code" :checked="lang === l.code" @change="setLang(l.code)" />
            <span>{{ l.name }}</span>
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>{{ t('settings.difficulty') }}</legend>
        <div class="group">
          <label v-for="d in DIFFICULTIES" :key="d" class="opt" :class="{ on: settings.difficulty === d }">
            <input v-model="settings.difficulty" type="radio" name="difficulty" :value="d" />
            <span class="text">
              <strong>{{ t('diff.' + d + '.name') }}</strong>
              <span class="desc">{{ t('diff.' + d + '.desc', { n: DIFFICULTY[d].winPeople }) }}</span>
            </span>
          </label>
        </div>
      </fieldset>

      <p v-if="pending" class="note">{{ t('settings.pending', { d: t('diff.' + game.difficulty + '.name') }) }}</p>

      <div class="actions">
        <button v-if="pending" class="primary" @click="emit('restart')">
          {{ t('settings.restart', { d: t('diff.' + settings.difficulty + '.name') }) }}
        </button>
        <button ref="closeBtn" @click="emit('close')">{{ t('settings.close') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.group { display: flex; flex-direction: column; gap: 8px; }
.group.langs { flex-direction: row; flex-wrap: wrap; }
.text { display: flex; flex-direction: column; gap: 2px; }
.desc { font-size: 0.85rem; color: var(--muted); line-height: 1.4; }
.note { margin-top: 12px; color: var(--line); font-size: 0.9rem; }
</style>
