import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'
import { Save, Lock, Building2, User, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

type Tab = 'organisation' | 'compte' | 'securite'

function Alert({ type, msg }: { type: 'success' | 'error'; msg: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
      {type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
      {msg}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6 space-y-5">
      <h2 className="font-semibold text-slate-800 text-base border-b border-slate-100 pb-3">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

// ─── Onglet Organisation ───────────────────────────────────────────────────────
function OrgTab() {
  const { org } = useAuth()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    apiFetch('/api/settings/org')
      .then(d => setName(d.name || ''))
      .catch(() => setName(org?.name || ''))
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true); setAlert(null)
    try {
      const res = await fetch('/api/settings/org', {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAlert({ type: 'success', msg: 'Nom de l\'organisation mis à jour.' })
      // Rafraîchir la page pour que le Layout reflète le nouveau nom
      setTimeout(() => window.location.reload(), 1200)
    } catch (e: any) {
      setAlert({ type: 'error', msg: e.message })
    } finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" /></div>

  return (
    <Section title="Organisation / Cabinet">
      {alert && <Alert type={alert.type} msg={alert.msg} />}
      <Field label="Nom de l'organisation" hint="Affiché dans la barre latérale et sur tous les exports.">
        <input
          className="input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nom du cabinet ou de l'entreprise"
        />
      </Field>
      <div className="pt-1">
        <button onClick={save} disabled={saving || !name.trim()} className="btn-primary">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Enregistrer
        </button>
      </div>
    </Section>
  )
}

// ─── Onglet Compte ─────────────────────────────────────────────────────────────
function CompteTab() {
  const { user } = useAuth()

  return (
    <Section title="Informations du compte">
      <Field label="Adresse e-mail" hint="L'adresse e-mail ne peut pas être modifiée directement. Contactez le support si nécessaire.">
        <input className="input bg-slate-50 text-slate-500 cursor-not-allowed" value={user?.email || ''} readOnly />
      </Field>
      <Field label="Identifiant utilisateur" hint="Identifiant interne unique, non modifiable.">
        <input className="input bg-slate-50 text-slate-500 cursor-not-allowed font-mono text-xs" value={user?.id || ''} readOnly />
      </Field>
    </Section>
  )
}

// ─── Onglet Sécurité ──────────────────────────────────────────────────────────
function SecuriteTab() {
  const [form, setForm] = useState({ current: '', nouveau: '', confirm: '' })
  const [show, setShow] = useState({ current: false, nouveau: false, confirm: false })
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const toggle = (k: keyof typeof show) => setShow(s => ({ ...s, [k]: !s[k] }))
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    setAlert(null)
    if (!form.current || !form.nouveau || !form.confirm) {
      return setAlert({ type: 'error', msg: 'Tous les champs sont requis.' })
    }
    if (form.nouveau !== form.confirm) {
      return setAlert({ type: 'error', msg: 'Les nouveaux mots de passe ne correspondent pas.' })
    }
    if (form.nouveau.length < 8) {
      return setAlert({ type: 'error', msg: 'Nouveau mot de passe : 8 caractères minimum.' })
    }
    setSaving(true)
    try {
      const res = await fetch('/api/settings/change-password', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: form.current, new_password: form.nouveau }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur changement mot de passe')
      setAlert({ type: 'success', msg: 'Mot de passe modifié avec succès.' })
      setForm({ current: '', nouveau: '', confirm: '' })
    } catch (e: any) {
      setAlert({ type: 'error', msg: e.message })
    } finally { setSaving(false) }
  }

  const PwField = ({ label, k }: { label: string; k: keyof typeof form }) => (
    <Field label={label}>
      <div className="relative">
        <input
          type={show[k] ? 'text' : 'password'}
          className="input pr-10"
          value={form[k]}
          onChange={e => set(k, e.target.value)}
          autoComplete={k === 'current' ? 'current-password' : 'new-password'}
        />
        <button
          type="button"
          onClick={() => toggle(k)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          {show[k] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </Field>
  )

  return (
    <Section title="Sécurité du compte">
      {alert && <Alert type={alert.type} msg={alert.msg} />}
      <PwField label="Mot de passe actuel" k="current" />
      <PwField label="Nouveau mot de passe" k="nouveau" />
      <PwField label="Confirmer le nouveau mot de passe" k="confirm" />
      <div className="pt-1">
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          Changer le mot de passe
        </button>
      </div>
    </Section>
  )
}

// ─── Page principale ───────────────────────────────────────────────────────────
export default function Settings() {
  const [tab, setTab] = useState<Tab>('organisation')

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'organisation', label: 'Organisation', icon: Building2 },
    { key: 'compte',       label: 'Compte',        icon: User },
    { key: 'securite',     label: 'Sécurité',      icon: Lock },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Paramètres</h1>
        <p className="text-slate-500 mt-1">Organisation, compte et sécurité</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t.key ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'organisation' && <OrgTab />}
      {tab === 'compte'       && <CompteTab />}
      {tab === 'securite'     && <SecuriteTab />}
    </div>
  )
}
