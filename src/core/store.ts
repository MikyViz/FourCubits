import { reactive } from 'vue'
import { createInitialState } from './state'
import type { GameState } from './types'

export const game = reactive<GameState>(createInitialState((Date.now() & 0xffff) || 1))

export function resetGame(seed = (Date.now() & 0xffff) || 1) {
  Object.assign(game, createInitialState(seed))
}
