import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'
import {
  Save, Lock, Building2, User, Eye, EyeOff, Loader2,
  CheckCircle2, AlertCircle, Copy, Check, Mail, Shield
} from 'lucide-react'

type Tab = 'organisation' | 'compte' | 'securite'

// ─── Composants partagés ──────────────────────────────────────────────────────
function Alert({ type, msg }: { type: 'success' | 'error'; msg: string }) {
  return (
    <div className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium ${
      type === 'success'
        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
        : 'bg-red-50 text-red-700 border border-red-100'
    }`}>
      {type === 'success'
        ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        : <AlertCircle className="w-4 h-4 flex-shrink-0" />
      }
      {msg}
    </div>
  )
}

function Section({ title, subtitle, icon: Icon, children }: {
  title: string; subtitle?: string; icon?: any; children: React.ReactNode
}) {
  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-start gap-3 pb-4 border-b border-slate-100">
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-primary-600" />
          </div>
        )}
        <div>
          <h2 className="font-bold text-slate-900 text-base">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1.5">{hint}</p>}
    </div>
  )
}

function ReadonlyField({ label, value, hint, mono = false }: { label: string; value: string; hint?: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Field label={label} hint={hint}>
      <div className="relative">
        <input
          readOnly
          value={value}
          className={`input pr-10 bg-slate-50 text-slate-500 cursor-default select-all ${mono ? 'font-mono text-xs' : ''}`}
        />
        <button
          onClick={copy}
          title="Copier"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-600 transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </Field>
  )
}

// ─── Onglet Organisation ──────────────────────────────────────────────────────
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
    if (!name.trim()) return
    setSaving(true); setAlert(null)
    try {
      const res = await fetch('/api/settings/org', {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setAlert({ type: 'success', msg: 'Nom du cabinet mis à jour.' })
      setTimeout(() => window.location.reload(), 1400)
    } catch (e: any) {
      setAlert({ type: 'error', msg: e.message })
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex justify-center py-10">
      <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
    </div>
  )

  return (
    <Section title="Organisation / Cabinet" subtitle="Nom affiché dans la sidebar et sur les exports" icon={Building2}>
      {alert && <Alert type={alert.type} msg={alert.msg} />}

      <Field label="Nom du cabinet" hint="Ce nom apparaît sur tous les bulletins de paie exportés.">
        <input
          className="input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ex : Cabinet Dupont & Associés"
          onKeyDown={e => e.key === 'Enter' && save()}
        />
      </Field>

      {org?.id && (
        <ReadonlyField
          label="Identifiant organisation"
          value={org.id}
          hint="Identifiant technique interne, non modifiable."
          mono
        />
      )}

      <div className="pt-1">
        <button onClick={save} disabled={saving || !name.trim()} className="btn btn-primary">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Enregistrer
        </button>
      </div>
    </Section>
  )
}

// ─── Onglet Compte ────────────────────────────────────────────────────────────
function CompteTab() {
  const { user } = useAuth()
  const [displayName, setDisplayName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const saveName = async () => {
    setSaving(true); setAlert(null)
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: displayName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setAlert({ type: 'success', msg: 'Profil mis à jour.' })
    } catch (e: any) {
      setAlert({ type: 'error', msg: e.message })
    } finally { setSaving(false) }
  }

  return (
    <Section title="Informations du compte" subtitle="Votre profil utilisateur" icon={User}>
      {alert && <Alert type={alert.type} msg={alert.msg} />}

      <Field label="Nom d'affichage">
        <input
          className="input"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder="Votre nom complet"
        />
      </Field>

      <ReadonlyField
        label="Adresse e-mail"
        value={user?.email || ''}
        hint="L'adresse e-mail est liée à votre compte et ne peut pas être modifiée ici."
      />

      <ReadonlyField
        label="Identifiant utilisateur"
        value={user?.id || ''}
        hint="Identifiant interne unique."
        mono
      />

      <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
        <Mail className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <p className="text-xs text-amber-700">
          Pour modifier votre adresse e-mail, contactez l'administrateur ou utilisez la fonction "Mot de passe oublié".
        </p>
      </div>

      <div className="pt-1">
        <button onClick={saveName} disabled={saving || !displayName.trim()} className="btn btn-primary">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Enregistrer le profil
        </button>
      </div>
    </Section>
  )
}

// ─── Onglet Sécurité ──────────────────────────────────────────────────────────
function SecuriteTab() {
  const [form, setForm] = useState({ current: '', nouveau: '', confirm: '' })
  const [show, setShow] = useState({ current: false, nouveau: false, confirm: false })
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const sf = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))
  const toggleShow = (k: keyof typeof show) => setShow(s => ({ ...s, [k]: !s[k] }))

  const strength = (pw: string) => {
    if (!pw) return 0
    let s = 0
    if (pw.length >= 8) s++
    if (/[A-Z]/.test(pw)) s++
    if (/[0-9]/.test(pw)) s++
    if (/[^A-Za-z0-9]/.test(pw)) s++
    return s
  }
  const s = strength(form.nouveau)
  const strengthLabel = ['', 'Faible', 'Moyen', 'Fort', 'Très fort'][s]
  const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-emerald-400', 'bg-emerald-500'][s]

  const save = async () => {
    setAlert(null)
    if (!form.current || !form.nouveau || !form.confirm)
      return setAlert({ type: 'error', msg: 'Tous les champs sont requis.' })
    if (form.nouveau !== form.confirm)
      return setAlert({ type: 'error', msg: 'Les nouveaux mots de passe ne correspondent pas.' })
    if (form.nouveau.length < 8)
      return setAlert({ type: 'error', msg: 'Minimum 8 caractères requis.' })
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
          className="input pr-11"
          value={form[k]}
          onChange={e => sf(k, e.target.value)}
          autoComplete={k === 'current' ? 'current-password' : 'new-password'}
          onKeyDown={e => e.key === 'Enter' && k === 'confirm' && save()}
        />
        <button
          type="button"
          onClick={() => toggleShow(k)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          {show[k] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </Field>
  )

  return (
    <Section title="Sécurité du compte" subtitle="Modifiez votre mot de passe" icon={Shield}>
      {alert && <Alert type={alert.type} msg={alert.msg} />}

      <PwField label="Mot de passe actuel" k="current" />
      <PwField label="Nouveau mot de passe" k="nouveau" />

      {/* Indicateur de force */}
      {form.nouveau && (
        <div className="space-y-1.5 -mt-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= s ? strengthColor : 'bg-slate-200'}`} />
            ))}
          </div>
          <p className={`text-xs font-medium ${s >= 3 ? 'text-emerald-600' : s >= 2 ? 'text-amber-600' : 'text-red-500'}`}>
            {strengthLabel}
          </p>
        </div>
      )}

      <PwField label="Confirmer le nouveau mot de passe" k="confirm" />

      {/* Conseils */}
      <div className="rounded-xl bg-slate-50 p-4 space-y-1.5">
        <p className="text-xs font-semibold text-slate-600 mb-2">Conseils :</p>
        {[
          { ok: form.nouveau.length >= 8, text: 'Au moins 8 caractères' },
          { ok: /[A-Z]/.test(form.nouveau), text: 'Une majuscule' },
          { ok: /[0-9]/.test(form.nouveau), text: 'Un chiffre' },
          { ok: /[^A-Za-z0-9]/.test(form.nouveau), text: 'Un caractère spécial' },
        ].map(({ ok, text }) => (
          <div key={text} className="flex items-center gap-2">
            <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${ok ? 'text-emerald-500' : 'text-slate-300'}`} />
            <span className={`text-xs transition-colors ${ok ? 'text-emerald-700' : 'text-slate-400'}`}>{text}</span>
          </div>
        ))}
      </div>

      <div className="pt-1">
        <button onClick={save} disabled={saving} className="btn btn-primary">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          Changer le mot de passe
        </button>
      </div>
    </Section>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
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
        <h1 className="section-title">Paramètres</h1>
        <p className="section-sub">Gérez votre organisation, profil et sécurité</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              tab === t.key
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
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
