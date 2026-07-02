import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Download, FileText, FileSpreadsheet, Filter, Loader2, Building2, TrendingUp, Users, CheckCircle2 } from 'lucide-react'
import { MONTH_NAMES, formatXOF } from '../lib/payroll'
import { generateBulletinPDF } from '../lib/pdf'

interface Period { id: string; period_month: number; period_year: number; status: string; clients?: { name: string } | null }
interface Client { id: string; name: string }

export default function ExportReports() {
  const { org } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [periods, setPeriods] = useState<Period[]>([])
  const [filterClient, setFilterClient] = useState('all')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<string | null>(null)

  useEffect(() => { if (org) fetchData() }, [org])

  const fetchData = async () => {
    if (!org) return
    const { data: clientData } = await supabase.from('clients').select('id, name').eq('organization_id', org.id).order('name')
    setClients(clientData || [])
    const clientIds = (clientData || []).map(c => c.id)
    if (!clientIds.length) { setLoading(false); return }
    const { data: periodData } = await supabase.from('payroll_periods').select('*, clients(name)').in('client_id', clientIds).order('period_year', { ascending: false }).order('period_month', { ascending: false })
    setPeriods(periodData || [])
    setLoading(false)
  }

  const filteredPeriods = periods.filter(p => filterClient === 'all' || p.clients?.name === clients.find(c => c.id === filterClient)?.name)

  // Export masse salariale CSV
  const exportCSV = async (periodId: string, periodLabel: string) => {
    setExporting(`csv-${periodId}`)
    const { data: vars } = await supabase
      .from('payroll_variables')
      .select('*, employees(first_name, last_name, matricule, position, category)')
      .eq('period_id', periodId)
      .eq('status', 'calculated')

    if (!vars?.length) { setExporting(null); alert('Aucun bulletin calculé pour cette période.'); return }

    const headers = ['Matricule','Prénom','Nom','Poste','Catégorie','Salaire Brut','CNSS Salarié','INAM Salarié','ITS','Total Retenues','Net à Payer','CNSS Patron','INAM Patron','Charges Patronales']
    const rows = vars.map(v => [
      v.employees?.matricule || '',
      v.employees?.first_name || '',
      v.employees?.last_name || '',
      v.employees?.position || '',
      v.employees?.category || '',
      v.gross_salary, v.cnss_employee, v.inam_employee, v.its_net,
      v.total_deductions, v.net_payable, v.cnss_employer, v.inam_employer,
      (v.cnss_employer || 0) + (v.inam_employer || 0)
    ])

    // Totaux
    const totals = ['', '', '', '', 'TOTAUX',
      rows.reduce((s, r) => s + Number(r[5]), 0),
      rows.reduce((s, r) => s + Number(r[6]), 0),
      rows.reduce((s, r) => s + Number(r[7]), 0),
      rows.reduce((s, r) => s + Number(r[8]), 0),
      rows.reduce((s, r) => s + Number(r[9]), 0),
      rows.reduce((s, r) => s + Number(r[10]), 0),
      rows.reduce((s, r) => s + Number(r[11]), 0),
      rows.reduce((s, r) => s + Number(r[12]), 0),
      rows.reduce((s, r) => s + Number(r[13]), 0),
    ]

    const csv = [headers, ...rows, totals].map(r => r.join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `masse-salariale-${periodLabel}.csv`; a.click()
    URL.revokeObjectURL(url)
    setExporting(null)
  }

  // Export bulletins PDF batch
  const exportBulletinsBatch = async (period: Period) => {
    setExporting(`pdf-${period.id}`)
    const { data: vars } = await supabase
      .from('payroll_variables')
      .select('*, employees(*, clients(name))')
      .eq('period_id', period.id)
      .eq('status', 'calculated')

    if (!vars?.length) { setExporting(null); alert('Aucun bulletin calculé.'); return }

    // Import dynamique jsPDF pour éviter re-render
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    for (const v of vars) {
      const emp = v.employees
      if (!emp) continue
      const { calculatePayroll } = await import('../lib/payroll')
      const result = calculatePayroll({ ...v, marital_status: emp.marital_status, children_count: emp.children_count })
      generateBulletinPDF({ employee: emp, period, variables: v, result, orgName: org?.name || '' })
      await new Promise(r => setTimeout(r, 300)) // éviter spam
    }
    setExporting(null)
  }

  // Stats résumé par période
  const PeriodStats = ({ periodId }: { periodId: string }) => {
    const [stats, setStats] = useState<any>(null)
    useEffect(() => {
      supabase.from('payroll_variables').select('gross_salary, net_payable, cnss_employer, inam_employer').eq('period_id', periodId).eq('status', 'calculated')
        .then(({ data }) => {
          if (!data?.length) return
          setStats({
            count: data.length,
            totalBrut: data.reduce((s, v) => s + v.gross_salary, 0),
            totalNet: data.reduce((s, v) => s + v.net_payable, 0),
            totalPatron: data.reduce((s, v) => s + v.cnss_employer + v.inam_employer, 0),
          })
        })
    }, [periodId])
    if (!stats) return null
    return (
      <div className="grid grid-cols-4 gap-2 mt-3 text-xs">
        {[
          { l: 'Bulletins', v: `${stats.count}` },
          { l: 'Masse brute', v: formatXOF(stats.totalBrut) },
          { l: 'Masse nette', v: formatXOF(stats.totalNet) },
          { l: 'Charges patron', v: formatXOF(stats.totalPatron) },
        ].map(({ l, v }) => (
          <div key={l} className="text-center p-2 bg-slate-50 rounded-lg">
            <p className="text-slate-400">{l}</p>
            <p className="font-bold text-slate-700 mt-0.5">{v}</p>
          </div>
        ))}
      </div>
    )
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Download className="w-5 h-5 text-white" />
          </div>
          Export & Rapports
        </h1>
        <p className="text-slate-500 mt-1">Masse salariale CSV · Bulletins PDF · Rapports OTR</p>
      </div>

      {/* Infos exports */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: FileSpreadsheet, title: 'Export CSV', desc: 'Masse salariale complète avec totaux, compatible Excel', color: 'emerald' },
          { icon: FileText, title: 'Bulletins PDF', desc: 'Génération en lot de tous les bulletins d\'une période', color: 'primary' },
          { icon: TrendingUp, title: 'Stats par période', desc: 'Vue résumé : brut, net, charges, nombre de bulletins', color: 'violet' },
        ].map(({ icon: Icon, title, desc, color }) => (
          <div key={title} className="card p-4 flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl bg-${color}-100 flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 text-${color}-600`} />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">{title}</p>
              <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtre */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-slate-400" />
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="input w-auto min-w-[200px]">
          <option value="all">Tous les clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {!periods.length ? (
        <div className="card p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">Aucune période de paie.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPeriods.map(period => (
            <div key={period.id} className="card p-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${period.status === 'closed' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                    <CheckCircle2 className={`w-5 h-5 ${period.status === 'closed' ? 'text-emerald-600' : 'text-amber-600'}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{MONTH_NAMES[period.period_month - 1]} {period.period_year}</h3>
                    <p className="text-sm text-slate-400">{period.clients?.name}</p>
                  </div>
                  {period.status === 'closed'
                    ? <span className="badge-success">Clôturée</span>
                    : <span className="badge-warning">Ouverte</span>
                  }
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => exportCSV(period.id, `${MONTH_NAMES[period.period_month - 1]}-${period.period_year}`)}
                    disabled={exporting === `csv-${period.id}`}
                    className="btn-secondary text-sm gap-2">
                    {exporting === `csv-${period.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
                    Export CSV
                  </button>
                  <button
                    onClick={() => exportBulletinsBatch(period)}
                    disabled={exporting === `pdf-${period.id}`}
                    className="btn-secondary text-sm gap-2">
                    {exporting === `pdf-${period.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-primary-600" />}
                    Bulletins PDF
                  </button>
                </div>
              </div>
              <PeriodStats periodId={period.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
