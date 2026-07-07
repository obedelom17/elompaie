import { useState } from 'react'
import { clientsApi, employeesApi, payrollApi } from '../lib/api'
import { Building2, Users, CalendarClock, CheckCircle2, ArrowRight, X } from 'lucide-react'
import { MONTH_NAMES } from '../lib/payroll'

interface Props { onDone: () => void }

const STEPS = [
  { id: 1, icon: Building2, title: 'Créer un client', sub: 'Ajoutez votre première entreprise cliente' },
  { id: 2, icon: Users, title: 'Ajouter un employé', sub: 'Enregistrez un salarié de ce client' },
  { id: 3, icon: CalendarClock, title: 'Ouvrir une période', sub: 'Lancez votre premier mois de paie' },
]

export function Onboarding({ onDone }: Props) {
  const [step, setStep] = useState(1)
  const [clientName, setClientName] = useState('')
  const [clientId, setClientId] = useState<string | null>(null)
  const [empForm, setEmpForm] = useState({ first_name: '', last_name: '', marital_status: 'celibataire', children_count: 0 })
  const [period, setPeriod] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string|null>(null)

  const handleClient = async () => {
    if (!clientName.trim()) return
    setSaving(true); setError(null)
    try {
      const data = await clientsApi.create({ name: clientName.trim() })
      setClientId(data.id); setStep(2)
    } catch (e: any) { setError(e.message) }
    setSaving(false)
  }

  const handleEmployee = async () => {
    if (!empForm.first_name || !empForm.last_name || !clientId) return
    setSaving(true); setError(null)
    try {
      await employeesApi.create({ client_id: clientId, ...empForm, children_count: Number(empForm.children_count), active: true, status: 'actif', contract_type: 'cdi' })
      setStep(3)
    } catch (e: any) { setError(e.message) }
    setSaving(false)
  }

  const handlePeriod = async () => {
    if (!clientId) return
    setSaving(true); setError(null)
    try {
      await payrollApi.createPeriod({ client_id: clientId, period_year: period.year, period_month: period.month })
      onDone()
    } catch (e: any) { setError(e.message) }
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onDone}>
      <div className="modal max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Démarrage rapide</h2>
          <button onClick={onDone} className="p-1.5 rounded-xl hover:bg-slate-100"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex gap-2">
            {STEPS.map(s => (
              <div key={s.id} className={`flex-1 h-1.5 rounded-full transition-colors ${step >= s.id ? 'bg-primary-600' : 'bg-slate-100'}`} />
            ))}
          </div>
          <div>
            {STEPS.map(s => s.id === step && (
              <div key={s.id} className="page-enter">
                <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center mb-4"><s.icon className="w-6 h-6 text-primary-600" /></div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">{s.title}</h3>
                <p className="text-slate-500 text-sm mb-4">{s.sub}</p>
                {step === 1 && (
                  <div className="space-y-3">
                    <input value={clientName} onChange={e => setClientName(e.target.value)} className="input" placeholder="Nom de l'entreprise" onKeyDown={e => e.key === 'Enter' && handleClient()} autoFocus />
                  </div>
                )}
                {step === 2 && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input value={empForm.first_name} onChange={e => setEmpForm({...empForm, first_name: e.target.value})} className="input" placeholder="Prénom" autoFocus />
                      <input value={empForm.last_name} onChange={e => setEmpForm({...empForm, last_name: e.target.value})} className="input" placeholder="Nom" />
                    </div>
                    <select value={empForm.marital_status} onChange={e => setEmpForm({...empForm, marital_status: e.target.value})} className="input">
                      <option value="celibataire">Célibataire</option>
                      <option value="marie">Marié(e)</option>
                    </select>
                    <div className="flex items-center gap-2"><label className="text-sm text-slate-600">Enfants :</label>
                      <input type="number" min="0" value={empForm.children_count} onChange={e => setEmpForm({...empForm, children_count: Number(e.target.value)})} className="input w-24" />
                    </div>
                  </div>
                )}
                {step === 3 && (
                  <div className="grid grid-cols-2 gap-3">
                    <select value={period.month} onChange={e => setPeriod({...period, month: Number(e.target.value)})} className="input">
                      {MONTH_NAMES.map((n, i) => <option key={i} value={i+1}>{n}</option>)}
                    </select>
                    <input type="number" value={period.year} onChange={e => setPeriod({...period, year: Number(e.target.value)})} className="input" />
                  </div>
                )}
                {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={onDone} className="btn-secondary">Plus tard</button>
            <button onClick={step === 1 ? handleClient : step === 2 ? handleEmployee : handlePeriod} disabled={saving} className="btn-primary flex-1">
              {saving ? '...' : step < 3 ? <span className="flex items-center gap-2">Suivant <ArrowRight className="w-4 h-4" /></span> : <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Terminer</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
