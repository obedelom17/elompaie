import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'
import { Save, Lock, Building2, User, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

type Tab = 'organisation' | 'compte' | 'securite'

function Alert({ type, msg }: { type: 'success' | 'error'; msg: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium"
      style={type === 'success'
        ? { background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }
        : { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }
      }>
      {type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
      {msg}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass p-7 space-y-5">
      <h2 className="font-bold text-white pb-3" style={{ fontSize: 15, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="label">{label}</label>
      {children}
      {hint && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{hint}</p>}
    </div>
  )
}

function OrgTab() {
  const { org } = useAuth()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    apiFetch('/api/settings/org').then(d => setName(d.name || '')).catch(() => setName(org?.name || '')).finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true); setAlert(null)
    try {
      const res = await fetch('/api/settings/org', { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAlert({ type: 'success', msg: 'Nom mis à jour.' })
      setTimeout(() => window.location.reload(), 1200)
    } catch (e: any) { setAlert({ type: 'error', msg: e.message }) }
    setSaving(false)
  }

  if (loading) return <div className="flex justify-center py-8"><div style={{ width:28,height:28,borderRadius:'50%',border:'3px solid rgba(168,85,247,0.3)',borderTopColor:'#a855f7',animation:'spin 0.8s linear infinite' }} /></div>

  return (
    <Section title="Organisation / Cabinet">
      {alert && <Alert type={alert.type} msg={alert.msg} />}
      <Field label="Nom de l'organisation" hint="Affiché dans la sidebar et sur tous les exports.">
        <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Nom du cabinet ou de l'entreprise" />
      </Field>
      <button onClick={save} disabled={saving || !name.trim()} className="btn btn-primary">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer
      </button>
    </Section>
  )
}

function CompteTab() {
  const { user } = useAuth()
  return (
    <Section title="Informations du compte">
      <Field label="Adresse e-mail" hint="L'adresse e-mail ne peut pas être modifiée directement.">
        <input className="input" value={user?.email || ''} readOnly style={{ opacity: 0.5, cursor: 'not-allowed' }} />
      </Field>
      <Field label="Identifiant utilisateur" hint="Identifiant interne unique, non modifiable.">
        <input className="input" value={user?.id || ''} readOnly style={{ opacity: 0.5, cursor: 'not-allowed', fontFamily: 'monospace', fontSize: 12 }} />
      </Field>
    </Section>
  )
}

function SecuriteTab() {
  const [form, setForm] = useState({ current: '', nouveau: '', confirm: '' })
  const [show, setShow] = useState({ current: false, nouveau: false, confirm: false })
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const sf = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const toggleShow = (k: keyof typeof show) => setShow(s => ({ ...s, [k]: !s[k] }))

  const save = async () => {
    setAlert(null)
    if (!form.current || !form.nouveau || !form.confirm) return setAlert({ type: 'error', msg: 'Tous les champs sont requis.' })
    if (form.nouveau !== form.confirm) return setAlert({ type: 'error', msg: 'Les mots de passe ne correspondent pas.' })
    if (form.nouveau.length < 8) return setAlert({ type: 'error', msg: '8 caractères minimum.' })
    setSaving(true)
    try {
      const res = await fetch('/api/settings/change-password', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ current_password: form.current, new_password: form.nouveau }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setAlert({ type: 'success', msg: 'Mot de passe modifié.' })
      setForm({ current: '', nouveau: '', confirm: '' })
    } catch (e: any) { setAlert({ type: 'error', msg: e.message }) }
    setSaving(false)
  }

  const PwField = ({ label, k }: { label: string; k: 'current' | 'nouveau' | 'confirm' }) => (
    <Field label={label}>
      <div className="relative">
        <input type={show[k] ? 'text' : 'password'} className="input pr-11" value={form[k]} onChange={e => sf(k, e.target.value)} autoComplete={k === 'current' ? 'current-password' : 'new-password'} />
        <button type="button" onClick={() => toggleShow(k)} style={{ position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.3)',display:'flex' }}>
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
      <button onClick={save} disabled={saving} className="btn btn-primary">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Changer le mot de passe
      </button>
    </Section>
  )
}

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
        <p className="section-sub">Organisation, compte et sécurité</p>
      </div>
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl w-fit" style={{ background: 'rgba(0,0,0,0.25)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
            style={tab === t.key
              ? { background: 'var(--grad-accent)', color: 'white', boxShadow: '0 2px 12px rgba(168,85,247,0.4)' }
              : { color: 'rgba(255,255,255,0.45)', background: 'transparent' }
            }
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
