import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { employeesApi, payrollApi } from '../lib/api'
import { ArrowLeft, FileText } from 'lucide-react'
import { SalaryHistoryChart } from '../components/SalaryHistoryChart'
import { formatXOF, calculateSeverancePay, calcAnciennete, calcIndemniteCongésNonPris } from '../lib/payroll'
import { SectionTitle, LeaderRow } from '../components/SectionTitle'
import { t, monthName, locale } from '../lib/i18n'

type EmployeeStatus = 'actif' | 'suspendu' | 'retraite' | 'decede'
const STATUS_LABELS: Record<EmployeeStatus, string> = { actif: 'Actif', suspendu: 'Suspendu', retraite: 'Retraité', decede: 'Décédé' }
const STATUS_COLORS: Record<EmployeeStatus, string> = { actif: 'bg-emerald-100 text-emerald-700', suspendu: 'bg-amber-100 text-amber-700', retraite: 'bg-primary-100 text-primary-700', decede: 'bg-slate-200 text-slate-500' }

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>()
  const [employee, setEmployee] = useState<any>(null)
  const [payrollHistory, setPayrollHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showSolde, setShowSolde] = useState(false)

  useEffect(() => { if (id) fetchData() }, [id])

  const fetchData = async () => {
    try {
      const emp = await employeesApi.get(id!)
      setEmployee(emp)
      // Fetch payroll history through periods
      const periods = await payrollApi.listPeriods(emp.client_id)
      const history: any[] = []
      for (const p of periods.slice(0, 12)) {
        const pvars = await payrollApi.listVariables(p.id)
        const empVar = pvars.find((v: any) => v.employee_id === id)
        if (empVar) history.push({ ...empVar, period_year: p.period_year, period_month: p.period_month })
      }
      setPayrollHistory(history)
    } catch {} finally { setLoading(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
  if (!employee) return <div className="text-center py-12"><p className="text-slate-500">{t("Employé introuvable.")}</p><Link to="/employees" className="btn-primary mt-4 inline-flex">{t("Retour")}</Link></div>

  const statusColor = STATUS_COLORS[employee.status as EmployeeStatus] || STATUS_COLORS.actif
  const anciennete = employee.hire_date ? calcAnciennete(employee.hire_date) : null
  const lastVar = payrollHistory[0]
  const severance = anciennete && lastVar ? calculateSeverancePay(lastVar.gross_salary, anciennete.years) : null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><Link to="/employees" className="btn-ghost"><ArrowLeft className="w-4 h-4" /> {t("Retour")}</Link></div>
      <div className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-primary-100 flex items-center justify-center text-primary-700 text-xl font-bold">{employee.first_name[0]}{employee.last_name[0]}</div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{employee.first_name} {employee.last_name}</h1>
              <p className="text-slate-500">{employee.position||'—'} · {employee.client_name}</p>
              <div className="flex gap-2 mt-2">
                <span className={`badge ${statusColor}`}>{t(STATUS_LABELS[employee.status as EmployeeStatus] || 'Actif')}</span>
                <span className="badge bg-slate-100 text-slate-600 uppercase text-[10px]">{employee.contract_type}</span>
              </div>
            </div>
          </div>
          <button onClick={() => setShowSolde(!showSolde)} className="btn-secondary"><FileText className="w-4 h-4" /> {t("Solde de tout compte")}</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 text-sm">
          {employee.matricule && <div><p className="text-xs text-slate-400">{t("Matricule")}</p><p className="font-medium">{employee.matricule}</p></div>}
          {employee.hire_date && <div><p className="text-xs text-slate-400">{t("Embauche")}</p><p className="font-medium">{new Date(employee.hire_date).toLocaleDateString(locale())}</p></div>}
          {anciennete && <div><p className="text-xs text-slate-400">{t("Ancienneté")}</p><p className="font-medium">{anciennete.years} {t("an")}{anciennete.years > 1 ? 's' : ''} {anciennete.months} {t("mois")}</p></div>}
          <div><p className="text-xs text-slate-400">{t("Situation")}</p><p className="font-medium">{t(({celibataire:'Célibataire',marie:'Marié(e)',divorce:'Divorcé(e)',veuf:'Veuf/Veuve'} as Record<string,string>)[employee.marital_status] || employee.marital_status)} · {employee.children_count} {t("enf.")}</p></div>
        </div>
      </div>

      {payrollHistory.length > 0 && (
        <div className="card p-6">
          <SectionTitle>{t("Historique de paie")}</SectionTitle>
          <SalaryHistoryChart variables={payrollHistory} />
          <div className="mt-4 space-y-2">
            {payrollHistory.slice(0, 6).map((v, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 text-sm">
                <span className="text-slate-600">{monthName(v.period_month - 1)} {v.period_year}</span>
                <span className="font-medium text-slate-900">{formatXOF(v.net_payable || 0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showSolde && anciennete && lastVar && (
        <div className="card p-6 border-l-4 border-l-amber-400">
          <SectionTitle>{t("Solde de tout compte estimatif")}</SectionTitle>
          <div className="text-sm">
            <SoldeRow label={t("Préavis (1 mois)")} value={lastVar.net_payable||0} />
            {severance !== null && <SoldeRow label={t("Indemnité de licenciement")} value={severance} />}
            <SoldeRow label={t("Congés non pris (estimé)")} value={calcIndemniteCongésNonPris(lastVar.base_salary||0, anciennete.years * 12 + anciennete.months).montant} />
            <div className="border-t border-slate-200 pt-2 mt-2"><SoldeRow label={t("Total estimé")} value={(lastVar.net_payable||0) + (severance||0) + calcIndemniteCongésNonPris(lastVar.base_salary||0, anciennete.years * 12 + anciennete.months).montant} bold /></div>
          </div>
          <p className="text-xs text-slate-400 mt-3">{t("Estimation indicative · Vérifier selon le motif de départ")}</p>
        </div>
      )}
    </div>
  )
}

function SoldeRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return <LeaderRow label={label} bold={bold}>{formatXOF(value)}</LeaderRow>
}
