import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Building2, Users, CalendarClock, CheckCircle2, ArrowRight, X } from 'lucide-react'

interface Props { onDone: () => void }

const STEPS = [
  { id: 1, icon: Building2, title: 'Créer un client', sub: 'Ajoutez votre première entreprise cliente' },
  { id: 2, icon: Users, title: 'Ajouter un employé', sub: 'Enregistrez un salarié de ce client' },
  { id: 3, icon: CalendarClock, title: 'Ouvrir une période', sub: 'Lancez votre premier mois de paie' },
]

export function Onboarding({ onDone }: Props) {
  const { org } = useAuth()
  const [step, setStep] = useState(1)

  // Étape 1 — Client
  const [clientName, setClientName] = useState('')
  const [clientId, setClientId] = useState<string | null>(null)
  const [savingClient, setSavingClient] = useState(false)

  // Étape 2 — Employé
  const [empForm, setEmpForm] = useState({ first_name: '', last_name: '', marital_status: 'celibataire', children_count: 0 })
  const [savingEmp, setSavingEmp] = useState(false)

  // Étape 3 — Période
  const [period, setPeriod] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 })
  const [savingPeriod, setSavingPeriod] = useState(false)

  const handleClient = async () => {
    if (!clientName.trim() || !org) return
    setSavingClient(true)
    const { data } = await supabase.from('clients').insert({ organization_id: org.id, name: clientName.trim() }).select().single()
    setClientId(data?.id || null)
    setSavingClient(false)
    setStep(2)
  }

  const handleEmployee = async () => {
    if (!empForm.first_name || !empForm.last_name || !clientId) return
    setSavingEmp(true)
    await supabase.from('employees').insert({
      client_id: clientId, ...empForm,
      children_count: Number(empForm.children_count),
      active: true, status: 'actif', contract_type: 'cdi',
    })
    setSavingEmp(false)
    setStep(3)
  }

  const handlePeriod = async () => {
    if (!clientId) return
    setSavingPeriod(true)
    await supabase.from('payroll_periods').insert({
      client_id: clientId,
      period_year: period.year,
      period_month: period.month,
      status: 'open',
    })
    setSavingPeriod(false)
    onDone()
  }

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary-500 to-accent-600 px-8 py-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-white/70 uppercase tracking-wide">Démarrage rapide</p>
            <button onClick={onDone} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"><X className="w-4 h-4" /></button>
          </div>
          <h2 className="text-2xl font-bold">Configurez ObedPaie</h2>
          <p className="text-white/70 text-sm mt-1">3 étapes pour traiter votre première paie</p>
          {/* Progress */}
          <div className="flex gap-2 mt-5">
            {STEPS.map(s => (
              <div key={s.id} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= s.id ? 'bg-white' : 'bg-white/30'}`} />
            ))}
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex border-b border-slate-100">
          {STEPS.map(s => (
            <div key={s.id} className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs font-medium transition-colors ${step === s.id ? 'text-primary-600' : step > s.id ? 'text-emerald-600' : 'text-slate-300'}`}>
              {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
              <span className="hidden sm:block">{s.title}</span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="p-8">
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">{STEPS[0].title}</h3>
                <p className="text-slate-500 text-sm mt-1">{STEPS[0].sub}</p>
              </div>
              <div>
                <label className="label">Nom de l'entreprise cliente</label>
                <input value={clientName} onChange={e => setClientName(e.target.value)} className="input" placeholder="Ex: SARL Togo Import" onKeyDown={e => e.key === 'Enter' && handleClient()} />
              </div>
              <button onClick={handleClient} disabled={!clientName.trim() || savingClient} className="btn-primary w-full py-3">
                {savingClient ? 'Création...' : 'Créer le client'} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">{STEPS[1].title}</h3>
                <p className="text-slate-500 text-sm mt-1">Pour <strong>{clientName}</strong></p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Prénom</label><input value={empForm.first_name} onChange={e => setEmpForm({...empForm, first_name: e.target.value})} className="input" placeholder="Kofi" /></div>
                <div><label className="label">Nom</label><input value={empForm.last_name} onChange={e => setEmpForm({...empForm, last_name: e.target.value})} className="input" placeholder="Mensah" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Situation</label>
                  <select value={empForm.marital_status} onChange={e => setEmpForm({...empForm, marital_status: e.target.value})} className="input">
                    <option value="celibataire">Célibataire</option>
                    <option value="marie">Marié(e)</option>
                  </select>
                </div>
                <div><label className="label">Enfants</label><input type="number" min="0" max="6" value={empForm.children_count} onChange={e => setEmpForm({...empForm, children_count: Number(e.target.value)})} className="input" /></div>
              </div>
              <button onClick={handleEmployee} disabled={!empForm.first_name || !empForm.last_name || savingEmp} className="btn-primary w-full py-3">
                {savingEmp ? 'Création...' : 'Ajouter l\'employé'} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">{STEPS[2].title}</h3>
                <p className="text-slate-500 text-sm mt-1">Choisissez le mois à traiter</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Mois</label>
                  <select value={period.month} onChange={e => setPeriod({...period, month: Number(e.target.value)})} className="input">
                    {['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'].map((m, i) => (
                      <option key={i} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div><label className="label">Année</label>
                  <input type="number" value={period.year} onChange={e => setPeriod({...period, year: Number(e.target.value)})} className="input" min="2020" max="2030" />
                </div>
              </div>
              <button onClick={handlePeriod} disabled={savingPeriod} className="btn-primary w-full py-3">
                {savingPeriod ? 'Création...' : 'Démarrer la paie 🚀'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
