import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { clientsApi, employeesApi, payrollApi } from '../lib/api'
import { ArrowLeft, Building2, Users, CalendarClock } from 'lucide-react'
import { MONTH_NAMES } from '../lib/payroll'

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const [client, setClient] = useState<any>(null)
  const [employees, setEmployees] = useState<any[]>([])
  const [periods, setPeriods] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (id) fetchData() }, [id])

  const fetchData = async () => {
    try {
      const [c, emps, perds] = await Promise.all([
        clientsApi.get(id!),
        employeesApi.list(id),
        payrollApi.listPeriods(id),
      ])
      setClient(c); setEmployees(emps); setPeriods(perds)
    } catch {} finally { setLoading(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
  if (!client) return <div className="text-center py-12"><p className="text-slate-500">Client introuvable.</p><Link to="/clients" className="btn-primary mt-4 inline-flex">Retour</Link></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><Link to="/clients" className="btn-ghost"><ArrowLeft className="w-4 h-4" /> Retour</Link></div>
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary-100 flex items-center justify-center"><Building2 className="w-7 h-7 text-primary-600" /></div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
              {client.ifu && <div><span className="text-slate-500">IFU:</span> <span className="font-medium">{client.ifu}</span></div>}
              {client.rccm && <div><span className="text-slate-500">RCCM:</span> <span className="font-medium">{client.rccm}</span></div>}
              {client.sector && <div><span className="text-slate-500">Secteur:</span> <span className="font-medium">{client.sector}</span></div>}
              {client.phone && <div><span className="text-slate-500">Tél:</span> <span className="font-medium">{client.phone}</span></div>}
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-slate-900 flex items-center gap-2"><Users className="w-5 h-5 text-primary-600" /> Employés ({employees.length})</h2><Link to="/employees" className="text-sm text-primary-600 hover:underline">Voir tout</Link></div>
          {employees.length === 0 ? <p className="text-slate-500 text-sm">Aucun employé.</p> : (
            <div className="space-y-2">{employees.slice(0, 5).map((emp) => (
              <Link key={emp.id} to={`/employees/${emp.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-medium">{emp.first_name[0]}{emp.last_name[0]}</div>
                <div className="flex-1"><p className="text-sm font-medium text-slate-900">{emp.first_name} {emp.last_name}</p><p className="text-xs text-slate-500">{emp.position || '—'}</p></div>
                {emp.active ? <span className="badge-success">Actif</span> : <span className="badge-error">Inactif</span>}
              </Link>
            ))}</div>
          )}
        </div>
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-slate-900 flex items-center gap-2"><CalendarClock className="w-5 h-5 text-primary-600" /> Périodes de paie ({periods.length})</h2><Link to="/payroll" className="text-sm text-primary-600 hover:underline">Voir tout</Link></div>
          {periods.length === 0 ? <p className="text-slate-500 text-sm">Aucune période.</p> : (
            <div className="space-y-2">{periods.slice(0, 5).map((p) => (
              <Link key={p.id} to={`/payroll/${p.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                <span className="text-sm font-medium text-slate-900">{MONTH_NAMES[p.period_month - 1]} {p.period_year}</span>
                {p.status === 'open' ? <span className="badge-warning">Ouverte</span> : <span className="badge-success">Clôturée</span>}
              </Link>
            ))}</div>
          )}
        </div>
      </div>
    </div>
  )
}
