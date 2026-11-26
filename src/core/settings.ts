import { reactive, watch } from 'vue'
import { DIFFICULTIES } from '../data/difficulty'
import type { Difficulty } from './types'

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
const write = (key: string, v: string) => {
  try {
    localStorage.setItem(key, v)
  } catch {
    /* ignore */
  }
}

const saved = read('settler.difficulty')

// настройки, которые переживают перезагрузку страницы (язык хранится в i18n)
export const settings = reactive({
  difficulty: (DIFFICULTIES.includes(saved as Difficulty) ? saved : 'normal') as Difficulty,
  skipIntro: read('settler.skipIntro') === '1',
})

watch(() => settings.difficulty, (v) => write('settler.difficulty', v))
watch(() => settings.skipIntro, (v) => write('settler.skipIntro', v ? '1' : '0'))
