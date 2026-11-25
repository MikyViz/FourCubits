<script lang="ts">
import { ref } from 'vue'

// общее для всех подсказок: одновременно закреплена (открыта кликом) только одна
let counter = 0
const pinnedId = ref<number | null>(null)
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, watch } from 'vue'

const props = withDefaults(
  defineProps<{ placement?: 'bottom' | 'left' | 'top'; pinOnClick?: boolean; block?: boolean }>(),
  { placement: 'bottom', pinOnClick: false, block: false },
)

const uid = ++counter
const hover = ref(false)
const pinned = computed(() => pinnedId.value === uid)
const open = computed(() => hover.value || pinned.value)
const wrap = ref<HTMLElement | null>(null)
const pop = ref<HTMLElement | null>(null)
const pos = ref({ x: -9999, y: -9999 })
let showT: number | undefined
let hideT: number | undefined

function enter(e: PointerEvent) {
  if (e.pointerType !== 'mouse') return
  window.clearTimeout(hideT)
  showT = window.setTimeout(() => (hover.value = true), 120)
}
function leave(e: PointerEvent) {
  if (e.pointerType !== 'mouse') return
  window.clearTimeout(showT)
  hideT = window.setTimeout(() => (hover.value = false), 120)
}
function toggle() {
  pinnedId.value = pinned.value ? null : uid
}

function place() {
  const t = wrap.value
  const p = pop.value
  if (!t || !p) return
  const r = t.getBoundingClientRect()
  const pw = p.offsetWidth
  const ph = p.offsetHeight
  const vw = window.innerWidth
  const vh = window.innerHeight
  const m = 8
  let x = r.left
  let y = r.bottom + 6
  if (props.placement === 'left' && r.left - pw - m >= m) {
    x = r.left - pw - m
    y = r.top
  } else if (props.placement === 'top' && r.top - ph - 6 >= m) {
    y = r.top - ph - 6
  }
  pos.value = {
    x: Math.max(m, Math.min(x, vw - pw - m)),
    y: Math.max(m, Math.min(y, vh - ph - m)),
  }
}

watch(open, async (v) => {
  if (v) {
    await nextTick()
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
  } else {
    window.removeEventListener('scroll', place, true)
    window.removeEventListener('resize', place)
    pos.value = { x: -9999, y: -9999 }
  }
})

function onDocDown(e: PointerEvent) {
  if (pinned.value && wrap.value && !wrap.value.contains(e.target as Node)) pinnedId.value = null
}
function onKey(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  hover.value = false
  if (pinned.value) pinnedId.value = null
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocDown)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocDown)
  document.removeEventListener('keydown', onKey)
  window.removeEventListener('scroll', place, true)
  window.removeEventListener('resize', place)
  window.clearTimeout(showT)
  window.clearTimeout(hideT)
  if (pinned.value) pinnedId.value = null
})
</script>

<template>
  <div ref="wrap" class="tip" :class="{ block }" @pointerenter="enter" @pointerleave="leave">
    <span
      v-if="pinOnClick"
      class="trigger"
      tabindex="0"
      role="button"
      :aria-expanded="open"
      @click="toggle"
      @keydown.enter.prevent="toggle"
      @keydown.space.prevent="toggle"
    >
      <slot :toggle="toggle" :open="open" />
    </span>
    <slot v-else :toggle="toggle" :open="open" />
    <div v-if="open" ref="pop" class="pop" role="tooltip" :style="{ left: pos.x + 'px', top: pos.y + 'px' }">
      <slot name="content" />
    </div>
  </div>
</template>

<style scoped>
.tip { position: relative; display: inline-block; }
.tip.block { display: block; }
.trigger { display: block; cursor: help; border-radius: 4px; }
.trigger:focus-visible { outline: 2px solid var(--line); outline-offset: 2px; }
.pop {
  position: fixed; z-index: 30; max-width: min(340px, calc(100vw - 16px));
  padding: 10px 12px; background: #151c18; border: 1px solid var(--line);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45); font-size: 0.85rem; line-height: 1.45; color: var(--text);
  text-align: left; font-weight: 400;
}
.pop :deep(p) { margin: 0 0 6px; }
.pop :deep(p:last-child) { margin-bottom: 0; }
.pop :deep(strong) { font-weight: 600; }
.pop :deep(.dim) { color: var(--muted); }
</style>
