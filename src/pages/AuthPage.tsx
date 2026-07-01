import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Calculator, Mail, Lock, Building2, Loader2, Eye, EyeOff } from 'lucide-react'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setLoading(true)
    if (mode === 'signup') {
      if (!orgName.trim()) { setError('Veuillez saisir le nom du cabinet'); setLoading(false); return }
    }
    const { error: err } = mode === 'signup' ? await signUp(email, password, orgName) : await signIn(email, password)
    if (err) setError(err)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 mb-4 shadow-lg"><Calculator className="w-8 h-8 text-white" /></div>
          <h1 className="text-3xl font-bold text-white">ObedPaie</h1>
          <p className="text-slate-400 mt-2">Centralisation & pré-calcul de paie multi-client</p>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setMode('signin')} className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${mode === 'signin' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500'}`}>Connexion</button>
            <button onClick={() => setMode('signup')} className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${mode === 'signup' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500'}`}>Inscription</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && <div><label className="label">Nom du cabinet</label><div className="relative"><Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} className="input pl-10" placeholder="Cabinet Comptable Plus" /></div></div>}
            <div><label className="label">Email</label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input pl-10" placeholder="contact@cabinet.tg" /></div></div>
            <div><label className="label">Mot de passe</label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} className="input pl-10 pr-10" placeholder="••••••••" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
            {error && <div className="bg-error-50 border border-error-200 text-error-700 text-sm rounded-lg px-4 py-3">{error}</div>}
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'signin' ? 'Se connecter' : 'Créer le compte'}</button>
          </form>
        </div>
        <p className="text-center text-slate-400 text-sm mt-6">Conforme au Code du Travail Togo 2021 & CGI OTR 2025</p>
      </div>
    </div>
  )
}
