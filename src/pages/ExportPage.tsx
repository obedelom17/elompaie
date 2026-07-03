import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Download, FileSpreadsheet, FileText, Loader2, Filter } from 'lucide-react'
import { formatXOF, MONTH_NAMES } from '../lib/payroll'
import { generateBulletinPDF } from '../lib/pdf'
import { calculatePayroll } from '../lib/payroll'

interface Period { id: string; period_month: number; period_year: number; clients: { name: string } | null }

export default function ExportPage() {
  const { org } = useAuth()
  const [periods, setPeriods] = useState<Period[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => { if (org) fetchPeriods() }, [org])

  const fetchPeriods = async () => {
    if (!org) return
    const { data: clients } = await supabase.from('clients').select('id').eq('organization_id', org.id)
    const ids = (clients || []).map(c => c.id)
    if (!ids.length) return
    const { data } = await supabase.from('payroll_periods').select('*, clients(name)').in('client_id', ids).order('period_year', { ascending: false }).order('period_month', { ascending: false })
    setPeriods(data || [])
  }

  const exportExcel = async () => {
    if (!selectedPeriod) return
    setExporting(true)
    try {
      const { data: vars } = await supabase.from('payroll_variables')
        .select('*, employees(first_name, last_name, matricule, position, marital_status, children_count)')
        .eq('period_id', selectedPeriod)
        .eq('status', 'calculated')

      const period = periods.find(p => p.id === selectedPeriod)
      if (!vars || !period) return

      // Génération CSV (compatible Excel)
      const headers = ['Matricule','Nom','Prénom','Poste','Brut','CNSS Salarié','AMU Salarié','Abattement 28%','Charges Famille','Revenu Imposable','IRPP','Avance','Prêt','Net à payer','CNSS Employeur','AMU Employeur','Charges Patronales','Coût Total']
      const rows = vars.map(v => {
        const emp = v.employees as any
        const calc = calculatePayroll({
          base_salary: v.base_salary, overtime_premium: v.overtime_premium,
          pregnancy_allowance: v.pregnancy_allowance, function_allowance: v.function_allowance,
          communication_allowance: v.communication_allowance, housing_premium: v.housing_premium,
          meal_premium: v.meal_premium, transport_allowance: v.transport_allowance,
          salary_advance: v.salary_advance, loan_payment: v.loan_payment, flat_deduction: v.flat_deduction,
          marital_status: emp?.marital_status || 'celibataire', children_count: emp?.children_count || 0
        })
        return [
          emp?.matricule || '', emp?.last_name || '', emp?.first_name || '', emp?.position || '',
          calc.gross_salary, calc.cnss_employee, calc.amu_employee, calc.abattement_28,
          calc.charges_famille, calc.taxable_income_monthly, calc.irpp_net,
          v.salary_advance, v.loan_payment, calc.net_payable,
          calc.cnss_employer, calc.amu_employer, calc.employer_total,
          calc.gross_salary + calc.employer_total
        ]
      })

      // Totaux
      const totaux = headers.slice(4).map((_, i) => rows.reduce((s, r) => s + (Number(r[i + 4]) || 0), 0))
      rows.push(['', 'TOTAUX', '', '', ...totaux])

      const csv = [headers, ...rows].map(r => r.join(';')).join('\n')
      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `masse_salariale_${MONTH_NAMES[period.period_month - 1]}_${period.period_year}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally { setExporting(false) }
  }

  const exportAllPDF = async () => {
    if (!selectedPeriod) return
    setExporting(true)
    try {
      const { data: vars } = await supabase.from('payroll_variables')
        .select('*, employees(first_name, last_name, matricule, position, category, marital_status, children_count, clients(name))')
        .eq('period_id', selectedPeriod)
        .eq('status', 'calculated')
      const period = periods.find(p => p.id === selectedPeriod)
      if (!vars || !period) return

      // Générer PDF par PDF (lot)
      for (const v of vars) {
        const emp = v.employees as any
        const result = calculatePayroll({
          base_salary: v.base_salary, overtime_premium: v.overtime_premium,
          pregnancy_allowance: v.pregnancy_allowance, function_allowance: v.function_allowance,
          communication_allowance: v.communication_allowance, housing_premium: v.housing_premium,
          meal_premium: v.meal_premium, transport_allowance: v.transport_allowance,
          salary_advance: v.salary_advance, loan_payment: v.loan_payment, flat_deduction: v.flat_deduction,
          marital_status: emp?.marital_status || 'celibataire', children_count: emp?.children_count || 0
        })
        generateBulletinPDF({ employee: emp, period, variables: v, result, orgName: org?.name || '' })
        await new Promise(r => setTimeout(r, 300)) // délai entre PDF
      }
    } finally { setExporting(false) }
  }

  const period = periods.find(p => p.id === selectedPeriod)

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Export & Rapports</h1>
        <p className="text-slate-500 mt-1">Export masse salariale, bulletins en lot</p>
      </div>

      {/* Sélection période */}
      <div className="card p-6">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary-500" /> Sélectionner une période
        </h3>
        <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)} className="input max-w-sm">
          <option value="">-- Choisir une période --</option>
          {periods.map(p => (
            <option key={p.id} value={p.id}>
              {MONTH_NAMES[p.period_month - 1]} {p.period_year} — {(p.clients as any)?.name}
            </option>
          ))}
        </select>
      </div>

      {selectedPeriod && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in">
          {/* Export CSV/Excel */}
          <div className="card p-6 hover:shadow-card-hover transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="font-bold text-slate-900 mb-1">Masse salariale Excel</h3>
            <p className="text-sm text-slate-500 mb-5">Export CSV détaillé avec totaux — {period?.clients && (period.clients as any).name}</p>
            <button onClick={exportExcel} disabled={exporting} className="btn-primary w-full">
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Télécharger CSV
            </button>
          </div>

          {/* Export PDF en lot */}
          <div className="card p-6 hover:shadow-card-hover transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="font-bold text-slate-900 mb-1">Bulletins PDF en lot</h3>
            <p className="text-sm text-slate-500 mb-5">Générer tous les bulletins de la période</p>
            <button onClick={exportAllPDF} disabled={exporting} className="btn-danger w-full">
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Générer tous les PDF
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
