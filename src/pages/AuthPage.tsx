import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { authClient } from '../lib/auth-client'
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { Logo } from '../components/Logo'
import { LanguageSwitch } from '../components/LanguageSwitch'
import { t } from '../lib/i18n'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const switchMode = (m: typeof mode) => { setMode(m); setError(null); setSuccess(null) }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setLoading(true)
    try {
      await (authClient as any).requestPasswordReset({ email, redirectTo: '/auth?reset=true' })
      setSuccess(t('Lien de réinitialisation envoyé. Vérifiez votre boîte mail.'))
    } catch (err: any) { setError(err.message) }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setSuccess(null); setLoading(true)
    if (mode === 'signup') {
      if (!orgName.trim()) { setError(t('Saisissez le nom du cabinet.')); setLoading(false); return }
      if (password.length < 6) { setError(t('Mot de passe : 6 caractères minimum.')); setLoading(false); return }
      const { error: err } = await signUp(email, password, orgName)
      if (err) setError(err)
    } else {
      const { error: err } = await signIn(email, password)
      if (err) setError(err.toLowerCase().includes('invalid') || err.toLowerCase().includes('incorrect') ? t('Email ou mot de passe incorrect.') : err)
    }
    setLoading(false)
  }

  const features = [
    t('Calcul IRPP · Barème CGI OTR 2025'),
    t('CNSS 4% · AMU 5% automatique'),
    t('Bulletins de paie PDF en 1 clic'),
    t('Multi-clients · Multi-employés'),
  ]

  const title = mode === 'signin' ? t('Connexion') : mode === 'signup' ? t('Créer un compte') : t('Réinitialiser le mot de passe')
  const subtitle = mode === 'signin' ? t('Accédez à votre espace cabinet') : mode === 'signup' ? t('Commencez gratuitement') : t('Un lien vous sera envoyé par email')

  return (
    <div className="min-h-screen flex bg-white">
      <aside className="relative hidden lg:flex lg:w-[44%] flex-col justify-between bg-primary-800 text-white p-12 overflow-hidden">
        <img src="/auth-bg.jpg" alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover object-[35%_center] opacity-25 mix-blend-luminosity" />
        <div className="absolute inset-0 bg-primary-800/70" aria-hidden />
        <div className="relative"><Logo size={32} light /></div>
        <div className="relative">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight max-w-md">
            {t('Gestion de paie multi-client pour cabinets comptables au Togo')}
          </h2>
          <ul className="mt-10 space-y-3 text-sm text-primary-100 border-t border-white/15 pt-6 max-w-md">
            {features.map(f => <li key={f}>{f}</li>)}
          </ul>
        </div>
        <p className="relative text-xs text-primary-200">{t('Conforme CGI OTR 2025 · Code du Travail Togo 2021')}</p>
      </aside>

      <main className="flex-1 flex flex-col">
        <div className="flex items-center justify-between p-4 lg:p-6">
          <div className="lg:hidden"><Logo size={26} /></div>
          <div className="ml-auto"><LanguageSwitch /></div>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{title}</h1>
            <p className="text-sm text-slate-500 mt-1 mb-6">{subtitle}</p>

            {mode !== 'reset' && (
              <div className="flex gap-6 mb-6 border-b border-slate-200">
                {(['signin', 'signup'] as const).map((m) => (
                  <button key={m} onClick={() => switchMode(m)}
                    className={`pb-2.5 -mb-px text-sm font-medium border-b-2 transition-colors ${mode === m ? 'border-primary-600 text-primary-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                    {m === 'signin' ? t('Connexion') : t('Inscription')}
                  </button>
                ))}
              </div>
            )}

            {mode === 'reset' ? (
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="label">{t('Email')}</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder={t('contact@cabinet.tg')} />
                </div>
                {error && <Notice kind="error">{error}</Notice>}
                {success && <Notice kind="success">{success}</Notice>}
                <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('Envoyer le lien')}
                </button>
                <button type="button" onClick={() => switchMode('signin')} className="w-full text-center text-sm text-slate-500 hover:text-primary-700">
                  {t('← Retour à la connexion')}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className="label">{t('Nom du cabinet')}</label>
                    <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)} className="input" placeholder={t('Cabinet Exemple & Associés')} required />
                  </div>
                )}
                <div>
                  <label className="label">{t('Email')}</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder={t('contact@cabinet.tg')} autoComplete="email" />
                </div>
                <div>
                  <label className="label">{t('Mot de passe')}</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} className="input pr-10"
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label="Toggle password visibility">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {mode === 'signup' && <p className="text-xs text-slate-400 mt-1.5">{t('6 caractères minimum')}</p>}
                </div>
                {error && <Notice kind="error">{error}</Notice>}
                {success && <Notice kind="success">{success}</Notice>}
                <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'signin' ? t('Se connecter') : t('Créer le compte')}
                </button>
                {mode === 'signin' && (
                  <button type="button" onClick={() => switchMode('reset')} className="w-full text-center text-sm text-slate-500 hover:text-primary-700">
                    {t('Mot de passe oublié ?')}
                  </button>
                )}
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function Notice({ kind, children }: { kind: 'error' | 'success'; children: React.ReactNode }) {
  const styles = kind === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-primary-50 border-primary-200 text-primary-900'
  const Icon = kind === 'error' ? AlertCircle : CheckCircle
  return (
    <div className={`flex items-start gap-2.5 border text-sm rounded-md px-3.5 py-2.5 ${styles}`}>
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  )
}
