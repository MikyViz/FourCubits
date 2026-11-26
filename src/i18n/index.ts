import { ref } from 'vue'
import type { Msg, Param } from '../core/types'
import { en } from './en'
import { he } from './he'
import { ru } from './ru'

export type Lang = 'en' | 'ru' | 'he'
// названия языков показываются на самих языках, их не переводим
export const LANGS: { code: Lang; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'ru', name: 'Русский' },
  { code: 'he', name: 'עברית' },
]

const dicts: Record<Lang, Record<string, string>> = { en, ru, he }
const STORAGE_KEY = 'settler.lang'

function load(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'en' || v === 'ru' || v === 'he') return v
  } catch {
    /* localStorage недоступен: остаёмся на английском */
  }
  return 'en'
}

export const lang = ref<Lang>(load())

export const isRtl = () => lang.value === 'he'

export function applyDirection() {
  if (typeof document === 'undefined') return
  document.documentElement.lang = lang.value
  document.documentElement.dir = isRtl() ? 'rtl' : 'ltr'
}

export function setLang(l: Lang) {
  lang.value = l
  try {
    localStorage.setItem(STORAGE_KEY, l)
  } catch {
    /* ignore */
  }
  applyDirection()
}

// t('key', { n: 5 }): подставляет {n}. Читает lang.value, поэтому шаблоны перерисовываются при смене языка
export function t(key: string, params?: Record<string, string | number>): string {
  const raw = dicts[lang.value][key] ?? en[key] ?? key
  return raw.replace(/\{(\w+)\}/g, (_, k: string) => String(params?.[k] ?? ''))
}

// Msg { key, params } может вкладываться в params другого Msg (например название постройки в записи журнала)
export function tm(m: Msg): string {
  const flat: Record<string, string | number> = {}
  for (const [k, v] of Object.entries(m.params ?? {}) as [string, Param][]) {
    flat[k] = typeof v === 'object' ? tm(v) : v
  }
  return t(m.key, flat)
}
