import { useEffect, useState } from 'react'
import { clientsApi, payrollApi } from '../lib/api'
import { Download, FileText, FileSpreadsheet, Filter, Loader2, Building2 } from 'lucide-react'
import { MONTH_NAMES, formatXOF } from '../lib/payroll'

export default function ExportReports() {
  const [clients, setClients] = useState<any[]>([])
  const [periods, setPeriods] = useState<any[]>([])
  const [filterClient, setFilterClient] = useState('all')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<string | null>(null)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [c, p] = await Promise.all([clientsApi.list(), payrollApi.listPeriods()])
      setClients(c); setPeriods(p)
    } catch {} finally { setLoading(false) }
  }

  const filteredPeriods = periods.filter(p => filterClient === 'all' || p.client_id === filterClient)

  const exportCSV = async (periodId: string, periodLabel: string) => {
    setExporting(`csv-${periodId}`)
    try {
      const vars = await payrollApi.listVariables(periodId)
      if (!vars.length) return
      const headers = ['Matricule', 'Nom', 'Poste', 'Catégorie', 'Brut', 'Net', 'CNSS sal.', 'AMU sal.', 'IRPP', 'CNSS patron.', 'AMU patron.', 'Coût employeur']
      const rows = vars.map((v: any) => [
        v.matricule||'', `${v.first_name} ${v.last_name}`, v.position||'', v.category||'',
        v.gross_salary||0, v.net_payable||0, v.cnss_employee||0, v.amu_employee||0, v.irpp_net||0, v.cnss_employer||0, v.amu_employer||0, v.employer_total||0
      ])
      const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `${periodLabel}.csv`; a.click(); URL.revokeObjectURL(url)
    } catch {} finally { setExporting(null) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-black text-slate-900">Rapports</h1><p className="text-slate-500 mt-1">Export par période</p></div>
        <div className="relative min-w-48">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="input pl-10">
            <option value="all">Tous les clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      {filteredPeriods.length === 0 ? (
        <div className="card p-12 text-center"><Building2 className="w-12 h-12 text-slate-200 mx-auto mb-3" /><p className="text-slate-500">Aucune période.</p></div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500 uppercase">Période</th>
              <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500 uppercase">Client</th>
              <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500 uppercase">Statut</th>
              <th className="py-3 px-5"></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {filteredPeriods.map(p => {
                const label = `${MONTH_NAMES[p.period_month-1]}-${p.period_year}-${p.client_name}`
                const isExporting = exporting === `csv-${p.id}`
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-5 font-medium">{MONTH_NAMES[p.period_month-1]} {p.period_year}</td>
                    <td className="py-3 px-5 text-slate-600">{p.client_name}</td>
                    <td className="py-3 px-5">{p.status === 'open' ? <span className="badge-warning">Ouverte</span> : <span className="badge-success">Clôturée</span>}</td>
                    <td className="py-3 px-5">
                      <button onClick={() => exportCSV(p.id, label)} disabled={!!exporting} className="btn-secondary text-xs py-1.5 px-3">
                        {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} CSV
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
