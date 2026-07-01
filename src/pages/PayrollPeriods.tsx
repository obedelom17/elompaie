import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { CalendarClock, Plus, Lock, Building2, ChevronRight } from 'lucide-react'
import { MONTH_NAMES } from '../lib/payroll'

interface PayrollPeriod { id: string; client_id: string; period_year: number; period_month: number; status: string; closed_at: string | null; clients?: { name: string } | null }
interface Client { id: string; name: string }

export default function PayrollPeriods() {
  const { org } = useAuth()
  const navigate = useNavigate()
  const [periods, setPeriods] = useState<PayrollPeriod[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ client_id: '', period_month: new Date().getMonth() + 1, period_year: new Date().getFullYear() })

  useEffect(() => { if (org) fetchData() }, [org])

  const fetchData = async () => {
    if (!org) return
    const { data: clientData } = await supabase.from('clients').select('id, name').eq('organization_id', org.id).order('name')
    setClients(clientData || [])
    const clientIds = (clientData || []).map((c) => c.id)
    if (clientIds.length === 0) { setLoading(false); return }
    const { data: periodData } = await supabase.from('payroll_periods').select('*, clients(name)').in('client_id', clientIds).order('period_year', { ascending: false }).order('period_month', { ascending: false })
    setPeriods(periodData || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: existing } = await supabase.from('payroll_periods').select('id').eq('client_id', form.client_id).eq('period_year', form.period_year).eq('period_month', form.period_month).maybeSingle()
    if (existing) { alert('Une période existe déjà pour ce client et ce mois.'); return }
    const { data, error } = await supabase.from('payroll_periods').insert({ client_id: form.client_id, period_month: Number(form.period_month), period_year: Number(form.period_year), status: 'open' }).select().single()
    if (!error && data) { setShowForm(false); navigate(`/payroll/${data.id}`) }
  }

  const handleClose = async (periodId: string) => {
    if (!confirm('Clôturer cette période ? Elle sera archivée et ne pourra plus être modifiée.')) return
    await supabase.from('payroll_periods').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', periodId)
    fetchData()
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-bold text-slate-900">Périodes de paie</h1><p className="text-slate-500 mt-1">Gestion et clôture mensuelle par client</p></div>
        <button onClick={() => { setForm({ ...form, client_id: clients[0]?.id || '' }); setShowForm(true) }} className="btn-primary" disabled={clients.length === 0}><Plus className="w-4 h-4" /> Nouvelle période</button>
      </div>
      {clients.length === 0 ? (
        <div className="card p-12 text-center"><Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Créez d'abord un client.</p></div>
      ) : periods.length === 0 ? (
        <div className="card p-12 text-center"><CalendarClock className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Aucune période de paie. Créez une période pour commencer.</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {periods.map((period) => (
            <div key={period.id} className="card p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div><h3 className="font-semibold text-slate-900">{MONTH_NAMES[period.period_month - 1]} {period.period_year}</h3><p className="text-sm text-slate-500">{period.clients?.name}</p></div>
                {period.status === 'open' ? <span className="badge-warning">Ouverte</span> : <span className="badge-success">Clôturée</span>}
              </div>
              {period.closed_at && <p className="text-xs text-slate-400 mb-3">Clôturée le {new Date(period.closed_at).toLocaleDateString('fr-FR')}</p>}
              <div className="flex gap-2">
                <Link to={`/payroll/${period.id}`} className="btn-secondary flex-1 text-sm">{period.status === 'open' ? 'Saisir les variables' : 'Consulter'}<ChevronRight className="w-4 h-4" /></Link>
                {period.status === 'open' && (<button onClick={() => handleClose(period.id)} className="btn-ghost text-error-600 hover:bg-error-50" title="Clôturer la période"><Lock className="w-4 h-4" /></button>)}
              </div>
            </div>
          ))}
        </div>
      )}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Nouvelle période de paie</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-slate-100"><span className="text-xl text-slate-400">×</span></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="label">Client *</label><select required value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className="input">{clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Mois *</label><select required value={form.period_month} onChange={(e) => setForm({ ...form, period_month: Number(e.target.value) })} className="input">{MONTH_NAMES.map((name, i) => (<option key={i} value={i + 1}>{name}</option>))}</select></div>
                <div><label className="label">Année *</label><input type="number" required value={form.period_year} onChange={(e) => setForm({ ...form, period_year: Number(e.target.value) })} className="input" /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Annuler</button>
                <button type="submit" className="btn-primary flex-1">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
