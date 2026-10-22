import { useLang } from '../lib/i18n'

/** Bascule FR / EN. La préférence est conservée dans le navigateur. */
export function LanguageSwitch({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLang()
  const base = 'px-2.5 py-1 text-xs font-medium transition-colors'
  return (
    <div className={`inline-flex rounded-md border border-slate-300 bg-white overflow-hidden ${className}`} role="group" aria-label="Langue / Language">
      {(['fr', 'en'] as const).map(l => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`${base} ${lang === l ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
