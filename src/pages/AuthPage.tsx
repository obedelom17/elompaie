import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Calculator, Mail, Lock, Building2, Loader2, Eye, EyeOff, AlertCircle, CheckCircle, Sparkles, KeyRound } from 'lucide-react'

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
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    })
    setLoading(false)
    if (err) setError(err.message)
    else setSuccess('Lien de réinitialisation envoyé. Vérifiez votre boîte mail.')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setSuccess(null); setLoading(true)
    if (mode === 'signup') {
      if (!orgName.trim()) { setError('Saisissez le nom du cabinet.'); setLoading(false); return }
      if (password.length < 6) { setError('Mot de passe : 6 caractères minimum.'); setLoading(false); return }
      const { error: err } = await signUp(email, password, orgName)
      if (err) { setError(err); setLoading(false); return }
      const { error: loginErr } = await signIn(email, password)
      if (loginErr) { setSuccess('Compte créé ! Connectez-vous.'); setMode('signin') }
    } else {
      const { error: err } = await signIn(email, password)
      if (err) setError(err.toLowerCase().includes('invalid') ? 'Email ou mot de passe incorrect.' : err)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a35 50%, #0f172a 100%)' }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #4f46e5 0%, transparent 60%), radial-gradient(circle at 80% 20%, #a21caf 0%, transparent 40%)' }} />
        <div className="absolute top-20 left-20 w-60 h-60 bg-primary-500/20 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-accent-500/20 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }} />
        <div className="relative text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mx-auto mb-8 shadow-glow-primary animate-float">
            <Calculator className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">ObedPaie</h2>
          <p className="text-white/60 text-lg mb-10 max-w-sm">Gestion de paie multi-client pour cabinets comptables au Togo</p>
          <div className="space-y-3">
            {['Calcul IRPP · Barème CGI OTR 2025', 'CNSS 4% · AMU 5% automatique', 'Bulletins de paie PDF en 1 clic', 'Multi-clients · Multi-employés'].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-white/70 text-sm">
                <div className="w-5 h-5 rounded-full bg-primary-500/30 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-3 h-3 text-primary-400" />
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mx-auto mb-3 shadow-glow-primary">
              <Calculator className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">ObedPaie</h1>
          </div>

          <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-modal p-8 animate-scale-in">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900">
                {mode === 'signin' ? 'Connexion' : mode === 'signup' ? 'Créer un compte' : 'Réinitialiser le mot de passe'}
              </h3>
              <p className="text-slate-500 text-sm mt-1">
                {mode === 'signin' ? 'Accédez à votre espace cabinet' : mode === 'signup' ? 'Commencez gratuitement' : 'Un lien vous sera envoyé par email'}
              </p>
            </div>

            {mode !== 'reset' && (
              <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl">
                {(['signin', 'signup'] as const).map((m) => (
                  <button key={m} onClick={() => switchMode(m)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${mode === m ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    {m === 'signin' ? 'Connexion' : 'Inscription'}
                  </button>
                ))}
              </div>
            )}

            {mode === 'reset' ? (
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="label">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input pl-10" placeholder="contact@cabinet.tg" />
                  </div>
                </div>
                {error && <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3"><AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error}</span></div>}
                {success && <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3"><CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{success}</span></div>}
                <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Envoyer le lien'}
                </button>
                <button type="button" onClick={() => switchMode('signin')} className="w-full text-center text-sm text-slate-500 hover:text-primary-600 transition-colors">
                  ← Retour à la connexion
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div className="animate-fade-in">
                    <label className="label">Nom du cabinet</label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)} className="input pl-10" placeholder="Cabinet Exemple & Associés" required />
                    </div>
                  </div>
                )}
                <div>
                  <label className="label">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input pl-10" placeholder="contact@cabinet.tg" autoComplete="email" />
                  </div>
                </div>
                <div>
                  <label className="label">Mot de passe</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} className="input pl-10 pr-10" placeholder="••••••••"
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {mode === 'signup' && <p className="text-xs text-slate-400 mt-1.5">6 caractères minimum</p>}
                </div>

                {error && <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 animate-fade-in"><AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error}</span></div>}
                {success && <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3 animate-fade-in"><CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{success}</span></div>}

                <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base mt-2">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : mode === 'signin' ? 'Se connecter' : 'Créer le compte'}
                </button>

                {mode === 'signin' && (
                  <button type="button" onClick={() => switchMode('reset')} className="w-full flex items-center justify-center gap-1.5 text-sm text-slate-400 hover:text-primary-600 transition-colors mt-1">
                    <KeyRound className="w-3.5 h-3.5" /> Mot de passe oublié ?
                  </button>
                )}
              </form>
            )}

            <p className="text-center text-xs text-slate-400 mt-6 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3" /> Conforme CGI OTR 2025 · Code du Travail Togo 2021
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
