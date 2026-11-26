<script setup lang="ts">
import { computed } from 'vue'
import { resolveEvent } from '../core/actions'
import { game } from '../core/store'
import type { Resources } from '../core/types'
import { canAfford } from '../core/util'
import { t } from '../i18n'
import { describePending } from '../systems/events'

const emit = defineEmits<{ message: [text: string] }>()
const ev = computed(() => describePending(game))

const costText = (cost?: Partial<Resources>) =>
  cost ? (Object.keys(cost) as (keyof Resources)[]).map((k) => `${cost[k]} ${t('cost.' + k)}`).join(', ') : ''

function choose(i: number) {
  emit('message', resolveEvent(game, i) ?? '')
}
</script>

<template>
  <div v-if="ev" class="backdrop">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="ev-title">
      <h2 id="ev-title">{{ ev.title }}</h2>
      <p>{{ ev.text }}</p>
      <div class="choices">
        <button v-for="(c, i) in ev.choices" :key="i" :disabled="!!c.cost && !canAfford(game, c.cost)" @click="choose(i)">
          <span>{{ c.label }}</span>
          <span v-if="c.cost" class="cost">{{ costText(c.cost) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backdrop { position: fixed; inset: 0; display: grid; place-items: center; background: rgba(10, 14, 12, 0.7); padding: 16px; z-index: 10; }
.modal { width: min(460px, 100%); background: var(--panel); border: 2px solid var(--line); padding: 20px; }
h2 { margin: 0 0 8px; font-size: 1.2rem; }
p { margin: 0 0 16px; line-height: 1.45; }
.choices { display: flex; flex-direction: column; gap: 8px; }
.choices button { display: flex; justify-content: space-between; gap: 12px; padding: 10px 12px; text-align: start; }
.cost { color: var(--muted); font-size: 0.85rem; white-space: nowrap; }
</style>
