import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react'
import en from './locales/en'

export type Lang = 'fr' | 'en'

const STORAGE_KEY = 'elompaie.lang'

function readStored(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'fr' || v === 'en') return v
  } catch { /* stockage indisponible */ }
  return 'fr'
}

let current: Lang = readStored()

export function getLang(): Lang { return current }

/** Traduit une clé française. Le français est la langue source. */
export function t(key: string, params?: Record<string, string | number>): string {
  let out = current === 'en' ? (en[key] ?? key) : key
  if (params) {
    for (const [k, v] of Object.entries(params)) out = out.split(`{${k}}`).join(String(v))
  }
  return out
}

export function locale(): string { return current === 'en' ? 'en-GB' : 'fr-FR' }

export function formatDate(d: Date | string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(d).toLocaleDateString(locale(), opts)
}

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function monthNames(): string[] { return current === 'en' ? MONTHS_EN : MONTHS_FR }
export function monthName(index: number): string { return monthNames()[index] ?? '' }

interface LangCtx { lang: Lang; setLang: (l: Lang) => void; toggle: () => void }
const Ctx = createContext<LangCtx>({ lang: 'fr', setLang: () => {}, toggle: () => {} })

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(current)

  const setLang = useCallback((l: Lang) => {
    current = l
    try { localStorage.setItem(STORAGE_KEY, l) } catch { /* ignore */ }
    setLangState(l)
  }, [])

  useEffect(() => { document.documentElement.lang = lang }, [lang])

  const value = useMemo(() => ({ lang, setLang, toggle: () => setLang(lang === 'fr' ? 'en' : 'fr') }), [lang, setLang])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useLang() { return useContext(Ctx) }
