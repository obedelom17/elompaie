import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { authClient } from '../lib/auth-client'
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
    try {
      await (authClient as any).requestPasswordReset({ email, redirectTo: '/auth?reset=true' })
      setSuccess('Lien de réinitialisation envoyé. Vérifiez votre boîte mail.')
    } catch (err: any) { setError(err.message) }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setSuccess(null); setLoading(true)
    if (mode === 'signup') {
      if (!orgName.trim()) { setError('Saisissez le nom du cabinet.'); setLoading(false); return }
      if (password.length < 6) { setError('Mot de passe : 6 caractères minimum.'); setLoading(false); return }
      const { error: err } = await signUp(email, password, orgName)
      if (err) setError(err)
    } else {
      const { error: err } = await signIn(email, password)
      if (err) setError(err.toLowerCase().includes('invalid') || err.toLowerCase().includes('incorrect') ? 'Email ou mot de passe incorrect.' : err)
    }
    setLoading(false)
  }

  const features = [
    'Calcul IRPP · Barème CGI OTR 2025',
    'CNSS 4% · AMU 5% automatique',
    'Bulletins de paie & exports Excel',
    'Multi-clients · Multi-employés',
  ]

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--grad-bg)', backgroundAttachment: 'fixed' }}>
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', top:-100, left:-100 }} />
        <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(236,72,153,0.15) 0%, transparent 70%)', bottom:-80, right:-60 }} />
      </div>

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-16 relative">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-float"
            style={{ background: 'var(--grad-accent)', boxShadow: '0 8px 32px rgba(168,85,247,0.5)' }}>
            <Calculator className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-black text-white mb-3 tracking-tight">ElomPaie</h1>
          <p className="text-lg mb-10" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Gestion de paie multi-client pour cabinets comptables au Togo
          </p>
          <div className="space-y-3 text-left">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(168,85,247,0.25)' }}>
                  <CheckCircle className="w-3.5 h-3.5" style={{ color: '#d8b4fe' }} />
                </div>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        <div className="w-full max-w-md">
          <div className="glass p-8" style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-3 mb-7">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--grad-accent)' }}>
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-black text-white">ElomPaie</span>
            </div>

            <h2 className="text-2xl font-black text-white mb-1">
              {mode === 'reset' ? 'Récupération' : mode === 'signin' ? 'Connexion' : 'Créer un compte'}
            </h2>
            <p className="mb-6" style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>
              {mode === 'reset' ? 'Entrez votre email pour recevoir un lien' : mode === 'signin' ? 'Content de vous revoir' : 'Commencez gratuitement'}
            </p>

            {/* Tabs */}
            {mode !== 'reset' && (
              <div className="flex gap-1 mb-6 p-1 rounded-2xl" style={{ background: 'rgba(0,0,0,0.2)' }}>
                {(['signin', 'signup'] as const).map((m) => (
                  <button key={m} onClick={() => switchMode(m)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                    style={mode === m
                      ? { background: 'var(--grad-accent)', color: 'white', boxShadow: '0 2px 12px rgba(168,85,247,0.4)' }
                      : { color: 'rgba(255,255,255,0.45)', background: 'transparent' }
                    }
                  >
                    {m === 'signin' ? 'Connexion' : 'Inscription'}
                  </button>
                ))}
              </div>
            )}

            {/* Forms */}
            {mode === 'reset' ? (
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="label">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input pl-11" placeholder="contact@cabinet.tg" />
                  </div>
                </div>
                {error && <div className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm" style={{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', color:'#f87171' }}><AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error}</span></div>}
                {success && <div className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm" style={{ background:'rgba(34,197,94,0.15)', border:'1px solid rgba(34,197,94,0.3)', color:'#4ade80' }}><CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{success}</span></div>}
                <button type="submit" disabled={loading} className="btn btn-primary w-full py-3 text-base">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Envoyer le lien'}
                </button>
                <button type="button" onClick={() => switchMode('signin')} className="btn btn-ghost w-full" style={{ fontSize: 13 }}>
                  ← Retour à la connexion
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div className="page-enter">
                    <label className="label">Nom du cabinet</label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
                      <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)} className="input pl-11" placeholder="Cabinet Exemple & Associés" required />
                    </div>
                  </div>
                )}
                <div>
                  <label className="label">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input pl-11" placeholder="contact@cabinet.tg" autoComplete="email" />
                  </div>
                </div>
                <div>
                  <label className="label">Mot de passe</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
                    <input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} className="input pl-11 pr-11" placeholder="••••••••" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)', background:'none', border:'none', cursor:'pointer' }}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {mode === 'signup' && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 5 }}>6 caractères minimum</p>}
                </div>
                {error && <div className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm" style={{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', color:'#f87171' }}><AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error}</span></div>}
                {success && <div className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm" style={{ background:'rgba(34,197,94,0.15)', border:'1px solid rgba(34,197,94,0.3)', color:'#4ade80' }}><CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{success}</span></div>}
                <button type="submit" disabled={loading} className="btn btn-primary w-full py-3 text-base mt-2">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : mode === 'signin' ? 'Se connecter' : 'Créer le compte'}
                </button>
                {mode === 'signin' && (
                  <button type="button" onClick={() => switchMode('reset')}
                    className="btn btn-ghost w-full" style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
                    <KeyRound className="w-3.5 h-3.5" /> Mot de passe oublié ?
                  </button>
                )}
              </form>
            )}

            <p className="text-center mt-6 flex items-center justify-center gap-1.5" style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
              <Sparkles className="w-3 h-3" /> Conforme CGI OTR 2025 · Code du Travail Togo 2021
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
