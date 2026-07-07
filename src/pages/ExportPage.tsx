import { useEffect, useState } from 'react'
import { payrollApi } from '../lib/api'
import { Download, FileSpreadsheet, FileText, Loader2, Filter } from 'lucide-react'
import { formatXOF, MONTH_NAMES, calculatePayroll } from '../lib/payroll'
import { generateBulletinPDF } from '../lib/pdf'

export default function ExportPage() {
  const [periods, setPeriods] = useState<any[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => { fetchPeriods() }, [])

  const fetchPeriods = async () => {
    try { setPeriods(await payrollApi.listPeriods()) } catch {}
  }

  const exportExcel = async () => {
    if (!selectedPeriod) return
    setExporting(true)
    try {
      const vars = await payrollApi.listVariables(selectedPeriod)
      const period = periods.find(p => p.id === selectedPeriod)
      if (!vars || !period) return
      const rows = vars.map((v: any) => ({
        Matricule: v.matricule || '',
        Nom: `${v.first_name} ${v.last_name}`,
        Poste: v.position || '',
        'Salaire brut': v.gross_salary || 0,
        'CNSS salarié': v.cnss_employee || 0,
        'AMU salarié': v.amu_employee || 0,
        'IRPP': v.irpp_net || 0,
        'Net à payer': v.net_payable || 0,
        'CNSS patronal': v.cnss_employer || 0,
        'AMU patronal': v.amu_employer || 0,
        'Coût employeur': v.employer_total || 0,
      }))
      const headers = Object.keys(rows[0] || {})
      const csv = [headers.join(';'), ...rows.map(r => Object.values(r).join(';'))].join('\n')
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `paie-${MONTH_NAMES[period.period_month-1]}-${period.period_year}.csv`
      a.click(); URL.revokeObjectURL(url)
    } catch {} finally { setExporting(false) }
  }

  const exportAllPDF = async () => {
    if (!selectedPeriod) return
    setExporting(true)
    try {
      const vars = await payrollApi.listVariables(selectedPeriod)
      const period = periods.find(p => p.id === selectedPeriod)
      if (!vars || !period) return
      for (const v of vars) {
        if (v.net_payable) await generateBulletinPDF({ employee: v, period, variables: v, result: v, orgName: '' })
      }
    } catch {} finally { setExporting(false) }
  }

  return (
    <div className="space-y-6 page-enter">
      <div><h1 className="text-2xl font-black text-slate-900">Export</h1><p className="text-slate-500 mt-1">Bulletins PDF · Tableau CSV</p></div>
      <div className="card p-6 space-y-5">
        <div>
          <label className="label flex items-center gap-2"><Filter className="w-4 h-4" /> Période</label>
          <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)} className="input max-w-sm">
            <option value="">Sélectionner une période…</option>
            {periods.map(p => <option key={p.id} value={p.id}>{MONTH_NAMES[p.period_month-1]} {p.period_year} · {p.client_name}</option>)}
          </select>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button onClick={exportAllPDF} disabled={!selectedPeriod || exporting} className="btn-primary">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Bulletins PDF
          </button>
          <button onClick={exportExcel} disabled={!selectedPeriod || exporting} className="btn-secondary">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />} Export CSV / Excel
          </button>
        </div>
      </div>
    </div>
  )
}
