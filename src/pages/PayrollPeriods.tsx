import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { payrollApi, clientsApi } from '../lib/api'
import { CalendarClock, Plus, Lock, Building2, ChevronRight, CheckCircle2, Clock, X } from 'lucide-react'
import { MONTH_NAMES } from '../lib/payroll'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/ui/Toast'

interface PayrollPeriod { id: string; client_id: string; period_year: number; period_month: number; status: string; closed_at: string|null; client_name?: string }
interface Client { id: string; name: string }

export default function PayrollPeriods() {
  const navigate = useNavigate()
  const { toasts, toast, dismiss } = useToast()
  const [periods, setPeriods] = useState<PayrollPeriod[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [closing, setClosing] = useState<string|null>(null)
  const [form, setForm] = useState({ client_id: '', period_month: new Date().getMonth()+1, period_year: new Date().getFullYear() })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [c, p] = await Promise.all([clientsApi.list(), payrollApi.listPeriods()])
      setClients(c); setPeriods(p)
    } catch {} finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const data = await payrollApi.createPeriod({ client_id: form.client_id, period_month: Number(form.period_month), period_year: Number(form.period_year) })
      setShowForm(false); toast('Période créée', 'success'); navigate(`/payroll/${data.id}`)
    } catch (err: any) { toast(err.message, 'warning') }
  }

  const handleClose = async (periodId: string) => {
    await payrollApi.updatePeriod(periodId, { status: 'closed', closed_at: new Date().toISOString() })
    setClosing(null); toast('Période clôturée', 'success'); fetchData()
  }

  const openPeriods = periods.filter(p => p.status === 'open')
  const closedPeriods = periods.filter(p => p.status === 'closed')

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>

  return (
    <div className="space-y-6 page-enter">
      <ToastContainer toasts={toasts} dismiss={dismiss} />
      <ConfirmModal open={!!closing} title="Clôturer la période" message="Cette période sera archivée." confirmLabel="Clôturer" danger onConfirm={() => closing && handleClose(closing)} onCancel={() => setClosing(null)} />
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-black text-slate-900">Périodes de paie</h1><p className="text-slate-500 mt-1">Gestion mensuelle par client</p></div>
        <button onClick={() => { setForm({...form, client_id: clients[0]?.id||''}); setShowForm(true) }} className="btn-primary" disabled={!clients.length}><Plus className="w-4 h-4" /> Nouvelle période</button>
      </div>

      {!clients.length ? (
        <div className="card p-12 text-center"><Building2 className="w-12 h-12 text-slate-200 mx-auto mb-3" /><p className="text-slate-500">Créez d'abord un client.</p></div>
      ) : (
        <div className="space-y-8">
          {openPeriods.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-amber-500" /> Périodes ouvertes ({openPeriods.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{openPeriods.map(p => <PeriodCard key={p.id} period={p} onClose={() => setClosing(p.id)} />)}</div>
            </div>
          )}
          {closedPeriods.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Périodes clôturées ({closedPeriods.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{closedPeriods.map(p => <PeriodCard key={p.id} period={p} />)}</div>
            </div>
          )}
          {!periods.length && <div className="card p-12 text-center"><CalendarClock className="w-12 h-12 text-slate-200 mx-auto mb-3" /><p className="text-slate-500">Aucune période.</p></div>}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">Nouvelle période de paie</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-xl hover:bg-slate-100"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="label">Client *</label>
                <select required value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})} className="input">
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Mois *</label>
                  <select required value={form.period_month} onChange={e => setForm({...form, period_month: Number(e.target.value)})} className="input">
                    {MONTH_NAMES.map((n, i) => <option key={i} value={i+1}>{n}</option>)}
                  </select>
                </div>
                <div><label className="label">Année *</label><input type="number" required value={form.period_year} onChange={e => setForm({...form, period_year: Number(e.target.value)})} className="input" /></div>
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

function PeriodCard({ period, onClose }: { period: any; onClose?: () => void }) {
  const isOpen = period.status === 'open'
  return (
    <div className={`card p-5 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300 ${isOpen ? 'border-l-4 border-l-amber-400' : 'border-l-4 border-l-emerald-400'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${isOpen ? 'bg-amber-100' : 'bg-emerald-100'}`}>
            {isOpen ? <Clock className="w-5 h-5 text-amber-600" /> : <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          </div>
          <h3 className="font-bold text-slate-900">{MONTH_NAMES[period.period_month - 1]} {period.period_year}</h3>
          <p className="text-sm text-slate-500">{period.client_name}</p>
        </div>
        {isOpen ? <span className="badge-warning">Ouverte</span> : <span className="badge-success">Clôturée</span>}
      </div>
      {period.closed_at && <p className="text-xs text-slate-400 mb-3">Clôturée le {new Date(period.closed_at).toLocaleDateString('fr-FR')}</p>}
      <div className="flex gap-2 mt-3">
        <Link to={`/payroll/${period.id}`} className="btn-secondary flex-1 text-sm justify-between">
          {isOpen ? 'Saisir variables' : 'Consulter'}<ChevronRight className="w-4 h-4" />
        </Link>
        {isOpen && onClose && (
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-red-50 hover:text-red-600 text-slate-400 transition-colors border border-slate-200" title="Clôturer"><Lock className="w-4 h-4" /></button>
        )}
      </div>
    </div>
  )
}
