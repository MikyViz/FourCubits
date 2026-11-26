import { reactive } from 'vue'
import { settings } from './settings'
import { createInitialState } from './state'
import type { Difficulty, GameState } from './types'

const newSeed = () => (Date.now() & 0xffff) || 1

export const game = reactive<GameState>(createInitialState(newSeed(), settings.difficulty))

export function resetGame(difficulty: Difficulty = settings.difficulty) {
  Object.assign(game, createInitialState(newSeed(), difficulty))
}
