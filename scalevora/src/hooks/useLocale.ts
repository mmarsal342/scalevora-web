import { useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { en, type TranslationKey } from '@/locales/en'
import { id } from '@/locales/id'
import type { Locale } from '@/types'

const dicts = { en, id } as const

const STORAGE_KEY = 'scalevora.locale'

function detectInitialLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
  if (stored === 'en' || stored === 'id') return stored
  return navigator.language.toLowerCase().startsWith('id') ? 'id' : 'en'
}

export function useLocale() {
  const locale = useAppStore((s) => s.locale)
  const setLocale = useAppStore((s) => s.setLocale)

  useEffect(() => {
    setLocale(detectInitialLocale())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const t = (key: TranslationKey): string => dicts[locale][key]

  const switchLocale = (next: Locale) => {
    localStorage.setItem(STORAGE_KEY, next)
    setLocale(next)
  }

  return { locale, t, switchLocale }
}
