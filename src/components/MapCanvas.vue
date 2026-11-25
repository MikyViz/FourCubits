<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { build, canMove, extendLegalZone, moveBuilding, moveQuote } from '../core/actions'
import { game } from '../core/store'
import type { BuildingType } from '../core/types'
import { BUILDINGS, ILLEGAL_SCRUTINY, buildCost, moveFee } from '../data/buildings'

const props = defineProps<{ tool: BuildingType | 'zone' | null }>()
const emit = defineEmits<{ message: [text: string] }>()

const CELL = 32
const canvas = ref<HTMLCanvasElement | null>(null)
const hover = ref<{ x: number; y: number } | null>(null)
const dragId = ref<number | null>(null)
let justDragged = false

const isLegal = (x: number, y: number) =>
  x >= 0 && y >= 0 && x < game.map.w && y < game.map.h && game.map.legal[y * game.map.w + x]
const inMap = (x: number, y: number) => x >= 0 && y >= 0 && x < game.map.w && y < game.map.h
const buildingAt = (x: number, y: number) => game.buildings.find((b) => b.x === x && b.y === y)

const attitudeColor = (a: number) => (a <= -1 ? '#D9573F' : a >= 1 ? '#6FAE7B' : '#9AA394')

const cursor = computed(() => {
  if (dragId.value !== null) return 'grabbing'
  const h = hover.value
  const b = h ? buildingAt(h.x, h.y) : undefined
  return b && canMove(game, b) ? 'grab' : 'crosshair'
})

function drawBuilding(ctx: CanvasRenderingContext2D, type: BuildingType, px: number, py: number) {
  if (type === 'house') {
    ctx.fillStyle = '#EDE8D8'
    ctx.fillRect(px + 6, py + 14, CELL - 12, CELL - 20)
    ctx.fillStyle = '#B5472C'
    ctx.beginPath()
    ctx.moveTo(px + 3, py + 15)
    ctx.lineTo(px + CELL / 2, py + 4)
    ctx.lineTo(px + CELL - 3, py + 15)
    ctx.closePath()
    ctx.fill()
  } else if (type === 'storage') {
    ctx.fillStyle = '#7A6A4A'
    ctx.fillRect(px + 5, py + 8, CELL - 10, CELL - 14)
    ctx.fillStyle = '#4F442E'
    ctx.fillRect(px + 12, py + 16, 8, CELL - 22)
  } else {
    ctx.fillStyle = '#3E5E8C'
    ctx.fillRect(px + 8, py + 10, CELL - 16, CELL - 16)
    ctx.fillStyle = '#EDE8D8'
    ctx.fillRect(px + CELL / 2 - 1, py + 3, 2, 9)
    ctx.fillRect(px + CELL / 2 + 1, py + 3, 7, 4)
  }
}

// плашка с подсказкой над клеткой (или под ней, если сверху нет места)
function drawTip(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, accent: string) {
  ctx.font = '13px system-ui'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  const tw = ctx.measureText(text).width + 16
  const bx = Math.max(4, Math.min(x * CELL + CELL / 2 - tw / 2, game.map.w * CELL - tw - 4))
  const by = y * CELL - 30 < 4 ? y * CELL + CELL + 6 : y * CELL - 30
  ctx.fillStyle = 'rgba(27,36,32,0.95)'
  ctx.fillRect(bx, by, tw, 24)
  ctx.strokeStyle = accent
  ctx.lineWidth = 1.5
  ctx.strokeRect(bx, by, tw, 24)
  ctx.fillStyle = '#EDE8D8'
  ctx.fillText(text, bx + 8, by + 12)
}

function draw() {
  const c = canvas.value
  const ctx = c?.getContext('2d')
  if (!c || !ctx) return
  const { w, h } = game.map
  c.width = w * CELL
  c.height = h * CELL

  // местность и разрешённая зона
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      ctx.fillStyle = isLegal(x, y) ? '#D6CCA6' : (x + y) % 2 ? '#B3A783' : '#B9AD8A'
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL)
    }
  }

  // граница зоны: пунктир по краям разрешённых клеток
  ctx.strokeStyle = '#E8A200'
  ctx.lineWidth = 3
  ctx.setLineDash([7, 4])
  ctx.beginPath()
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!isLegal(x, y)) continue
      const px = x * CELL
      const py = y * CELL
      if (!isLegal(x, y - 1)) { ctx.moveTo(px, py); ctx.lineTo(px + CELL, py) }
      if (!isLegal(x, y + 1)) { ctx.moveTo(px, py + CELL); ctx.lineTo(px + CELL, py + CELL) }
      if (!isLegal(x - 1, y)) { ctx.moveTo(px, py); ctx.lineTo(px, py + CELL) }
      if (!isLegal(x + 1, y)) { ctx.moveTo(px + CELL, py); ctx.lineTo(px + CELL, py + CELL) }
    }
  }
  ctx.stroke()
  ctx.setLineDash([])

  // постройки
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const b of game.buildings) {
    const px = b.x * CELL
    const py = b.y * CELL
    ctx.globalAlpha = b.id === dragId.value ? 0.3 : b.done ? 1 : 0.5
    drawBuilding(ctx, b.type, px, py)
    ctx.globalAlpha = 1
    if (!b.done) {
      ctx.fillStyle = '#1B2420'
      ctx.font = 'bold 13px system-ui'
      ctx.fillText(String(b.daysLeft), px + CELL / 2, py + CELL / 2 + 2)
    } else if (!b.legal) {
      ctx.fillStyle = '#E8A200'
      ctx.beginPath()
      ctx.arc(px + CELL - 7, py + 7, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#1B2420'
      ctx.font = 'bold 10px system-ui'
      ctx.fillText('!', px + CELL - 7, py + 8)
    }
    // свежую стройку можно перенести: белый пунктир вокруг
    if (canMove(game, b)) {
      ctx.strokeStyle = '#EDE8D8'
      ctx.lineWidth = 1.5
      ctx.setLineDash([3, 3])
      ctx.strokeRect(px + 1.5, py + 1.5, CELL - 3, CELL - 3)
      ctx.setLineDash([])
    }
  }

  // метки деревень по сторонам карты
  ctx.font = '13px system-ui'
  const placeLabel = (text: string, cx: number, cy: number, color: string, align: CanvasTextAlign) => {
    const tw = ctx.measureText(text).width
    const bx = align === 'right' ? cx - tw - 24 : cx - tw / 2 - 12
    ctx.fillStyle = 'rgba(27,36,32,0.88)'
    ctx.fillRect(bx, cy - 11, tw + 24, 22)
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(bx + 10, cy, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#EDE8D8'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, bx + 20, cy + 1)
  }
  for (const v of game.villages) {
    const color = attitudeColor(v.attitude)
    if (v.id === 'north') placeLabel(v.name, (w * CELL) / 2, 18, color, 'center')
    else if (v.id === 'south') placeLabel(v.name, (w * CELL) / 2, h * CELL - 18, color, 'center')
    else if (v.id === 'east') placeLabel(v.name, w * CELL - 6, (h * CELL) / 2, color, 'right')
  }

  // курсор: перетаскивание, подсказка про перенос или подсказка про стройку
  const hv = hover.value
  if (!hv || !inMap(hv.x, hv.y)) return
  const { x, y } = hv

  if (dragId.value !== null) {
    const b = game.buildings.find((v) => v.id === dragId.value)
    if (!b) return
    if (b.x === x && b.y === y) return drawTip(ctx, 'Отпустите на другой клетке, чтобы перенести', x, y, '#EDE8D8')
    if (buildingAt(x, y)) return drawTip(ctx, 'Клетка занята', x, y, '#D9573F')
    const legal = isLegal(x, y)
    const q = moveQuote(b, legal)
    ctx.globalAlpha = 0.7
    drawBuilding(ctx, b.type, x * CELL, y * CELL)
    ctx.globalAlpha = 1
    const accent = legal ? '#EDE8D8' : '#E8A200'
    ctx.strokeStyle = accent
    ctx.lineWidth = 2
    ctx.strokeRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2)
    const money = q.delta >= 0 ? `доплата ${q.delta}` : `возврат ${-q.delta}`
    let text = `Перенести: ${money} ден. (комиссия ${q.fee}), ${legal ? 'в зоне' : 'вне зоны'}, ${q.days} дн.`
    if (!legal) text += `, +${ILLEGAL_SCRUTINY} внимания`
    return drawTip(ctx, text, x, y, accent)
  }

  const here = buildingAt(x, y)
  if (here && canMove(game, here)) {
    return drawTip(ctx, `Потяните на другую клетку, чтобы перенести (комиссия ${moveFee(here.paid)} ден.)`, x, y, '#EDE8D8')
  }
  if (!props.tool) return

  const zone = props.tool === 'zone'
  const legalTile = isLegal(x, y)
  let text: string
  if (zone) {
    text = 'Расширить зону: 5 разр. + 60 ден.'
    ctx.strokeStyle = '#E8A200'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 3])
    ctx.strokeRect((x - 2) * CELL + 1, (y - 2) * CELL + 1, 5 * CELL - 2, 5 * CELL - 2)
    ctx.setLineDash([])
  } else {
    const cost = buildCost(props.tool, legalTile)
    text = `${BUILDINGS[props.tool].label}, ${legalTile ? 'в зоне' : 'вне зоны'}: ${cost.money} ден., ${cost.days} дн.`
    if (!legalTile) text += `, +${ILLEGAL_SCRUTINY} внимания`
  }
  const accent = zone || legalTile ? '#EDE8D8' : '#E8A200'
  ctx.strokeStyle = accent
  ctx.lineWidth = 2
  ctx.strokeRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2)
  drawTip(ctx, text, x, y, accent)
}

watchEffect(draw, { flush: 'post' })

function tileAt(e: MouseEvent) {
  const c = canvas.value
  if (!c) return null
  const r = c.getBoundingClientRect()
  const x = Math.floor(((e.clientX - r.left) / r.width) * game.map.w)
  const y = Math.floor(((e.clientY - r.top) / r.height) * game.map.h)
  return { x, y }
}

function onDown(e: PointerEvent) {
  const t = tileAt(e)
  if (!t) return
  const b = buildingAt(t.x, t.y)
  if (!b || !canMove(game, b)) return
  dragId.value = b.id
  hover.value = t
  canvas.value?.setPointerCapture(e.pointerId)
}

function onMove(e: PointerEvent) {
  hover.value = tileAt(e)
}

function onUp(e: PointerEvent) {
  if (dragId.value === null) return
  const id = dragId.value
  dragId.value = null
  // после перетаскивания браузер всё равно шлёт click: глушим его
  justDragged = true
  setTimeout(() => (justDragged = false), 0)
  const t = tileAt(e)
  const b = game.buildings.find((v) => v.id === id)
  if (!t || !b || (t.x === b.x && t.y === b.y)) return
  emit('message', moveBuilding(game, id, t.x, t.y) ?? 'Постройка перенесена')
}

function onLeave() {
  if (dragId.value === null) hover.value = null
}

function onClick(e: MouseEvent) {
  if (justDragged) return
  const t = tileAt(e)
  if (!t) return
  if (!props.tool) return emit('message', 'Выберите постройку в меню справа')
  const err = props.tool === 'zone' ? extendLegalZone(game, t.x, t.y) : build(game, props.tool, t.x, t.y)
  emit('message', err ?? '')
}
</script>

<template>
  <canvas
    ref="canvas"
    class="map"
    :style="{ cursor }"
    @click="onClick"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="dragId = null"
    @pointerleave="onLeave"
  />
</template>

<style scoped>
.map { display: block; width: 100%; height: auto; max-width: 100%; border: 2px solid var(--line); background: #B9AD8A; touch-action: none; }
</style>
