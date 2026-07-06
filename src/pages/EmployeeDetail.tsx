import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, User, CalendarClock, FileText, AlertTriangle, TrendingUp } from 'lucide-react'
import { SalaryHistoryChart } from '../components/SalaryHistoryChart'
import { SalaryHistoryChart } from '../components/SalaryHistoryChart'
import { MONTH_NAMES, formatXOF, calculateSeverancePay, calcAnciennete, calcIndemniteMaladie, calcIndemniteCongésNonPris, calcIndemniteMaterniteMensuelle } from '../lib/payroll'

type EmployeeStatus = 'actif' | 'suspendu' | 'retraite' | 'decede'

const STATUS_LABELS: Record<EmployeeStatus, string> = {
  actif: 'Actif', suspendu: 'Suspendu', retraite: 'Retraité', decede: 'Décédé'
}
const STATUS_COLORS: Record<EmployeeStatus, string> = {
  actif: 'bg-emerald-100 text-emerald-700',
  suspendu: 'bg-amber-100 text-amber-700',
  retraite: 'bg-blue-100 text-blue-700',
  decede: 'bg-slate-200 text-slate-500',
}

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>()
  const [employee, setEmployee] = useState<any>(null)
  const [variables, setVariables] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showSolde, setShowSolde] = useState(false)

  useEffect(() => { if (id) fetchData() }, [id])

  const fetchData = async () => {
    const { data: empData } = await supabase.from('employees').select('*, clients(name)').eq('id', id).maybeSingle()
    setEmployee(empData)
    if (empData) {
      const { data: varData } = await supabase.from('payroll_variables')
        .select('*, payroll_periods(period_year, period_month, clients(name))')
        .eq('employee_id', id).order('calculated_at', { ascending: false })
      setVariables(varData || [])
    }
    setLoading(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
  if (!employee) return <div className="text-center py-12"><p className="text-slate-500">Employé introuvable.</p><Link to="/employees" className="btn-primary mt-4 inline-flex">Retour</Link></div>

  const anc = calcAnciennete(employee.hire_date)
  const dernierBrut = variables[0]?.gross_salary || 0
  const status: EmployeeStatus = employee.status || 'actif'

  // Solde tout compte
  const indLicenciement = calculateSeverancePay(dernierBrut, anc.years)
  const moisTravailles = anc.years * 12 + anc.months
  const conges = calcIndemniteCongésNonPris(dernierBrut, moisTravailles)
  const maladie = calcIndemniteMaladie(dernierBrut, anc.years)
  const maternite = employee.gender === 'F' ? calcIndemniteMaterniteMensuelle(dernierBrut) : null
  const soldeTotalCompte = indLicenciement + conges.montant

  // Alerte CDD
  const cddDays = employee.contract_end_date
    ? Math.ceil((new Date(employee.contract_end_date).getTime() - Date.now()) / 86400000)
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/employees" className="btn-ghost"><ArrowLeft className="w-4 h-4" /> Retour</Link>
      </div>

      {/* Alerte CDD */}
      {employee.contract_type === 'cdd' && cddDays !== null && cddDays <= 30 && cddDays >= 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            Contrat CDD expire le {new Date(employee.contract_end_date).toLocaleDateString('fr-FR')}
            {cddDays === 0 ? ' — aujourd\'hui' : ` — dans ${cddDays} jour${cddDays > 1 ? 's' : ''}`}
          </p>
        </div>
      )}

      {/* Fiche employé */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center"><User className="w-7 h-7 text-primary-600" /></div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">{employee.first_name} {employee.last_name}</h1>
            <p className="text-slate-500">{employee.clients?.name}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
              {employee.matricule && <div><span className="text-slate-500">Matricule:</span> <span className="font-medium">{employee.matricule}</span></div>}
              {employee.position && <div><span className="text-slate-500">Poste:</span> <span className="font-medium">{employee.position}</span></div>}
              {employee.category && <div><span className="text-slate-500">Catégorie:</span> <span className="font-medium">{employee.category}</span></div>}
              <div><span className="text-slate-500">Situation:</span> <span className="font-medium">{employee.marital_status}</span></div>
              <div><span className="text-slate-500">Enfants:</span> <span className="font-medium">{employee.children_count}</span></div>
              {employee.hire_date && <div><span className="text-slate-500">Embauche:</span> <span className="font-medium">{new Date(employee.hire_date).toLocaleDateString('fr-FR')}</span></div>}
              <div><span className="text-slate-500">Ancienneté:</span> <span className="font-medium">{anc.label}</span></div>
              <div><span className="text-slate-500">Contrat:</span> <span className="font-medium uppercase">{employee.contract_type || 'CDI'}</span></div>
              {employee.contract_end_date && <div><span className="text-slate-500">Fin contrat:</span> <span className="font-medium">{new Date(employee.contract_end_date).toLocaleDateString('fr-FR')}</span></div>}
            </div>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[status]}`}>{STATUS_LABELS[status]}</span>
        </div>
      </div>

      {/* Solde tout compte */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2"><FileText className="w-5 h-5 text-primary-600" /> Solde tout compte</h2>
          <button onClick={() => setShowSolde(!showSolde)} className="btn-secondary text-sm">
            {showSolde ? 'Masquer' : 'Calculer'}
          </button>
        </div>
        {showSolde && (
          <div className="animate-fade-in space-y-3">
            {dernierBrut === 0 && <p className="text-sm text-slate-400 italic">Aucune paie enregistrée — calcul basé sur salaire brut 0.</p>}
            <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-600">Indemnité de licenciement ({anc.years} an{anc.years > 1 ? 's' : ''})</span><span className="font-semibold">{formatXOF(indLicenciement)}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Congés non pris ({conges.joursNonPris}j)</span><span className="font-semibold">{formatXOF(conges.montant)}</span></div>
              <hr className="border-slate-200" />
              <div className="flex justify-between text-base font-bold"><span>Total solde tout compte</span><span className="text-primary-600">{formatXOF(soldeTotalCompte)}</span></div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 space-y-2 text-sm">
              <p className="font-semibold text-slate-700 mb-2">Indemnités spéciales (si applicable)</p>
              <div className="flex justify-between"><span className="text-slate-600">Indemnité maladie ({maladie.dureeLabel})</span><span className="font-semibold">{formatXOF(maladie.montant)}</span></div>
              {maternite && <div className="flex justify-between"><span className="text-slate-600">Part employeur maternité (50%)</span><span className="font-semibold">{formatXOF(maternite.partEmployeur)}</span></div>}
            </div>
            <p className="text-xs text-slate-400">Calcul basé sur dernier salaire brut ({formatXOF(dernierBrut)}) · {anc.label} d'ancienneté · {moisTravailles} mois travaillés</p>
          </div>
        )}
      </div>

      {/* Graphique évolution salaire */}
      {variables.length > 1 && (
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary-600" /> Évolution salaire (12 mois)
          </h2>
          <SalaryHistoryChart variables={variables} />
        </div>
      )}

      {/* Historique de paie */}
      <div className="card p-6">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-4"><CalendarClock className="w-5 h-5 text-primary-600" /> Historique de paie</h2>
        {variables.length === 0 ? <p className="text-slate-500 text-sm">Aucune paie calculée.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Période</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Brut</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">CNSS</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">IRPP</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Net à payer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {variables.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-900">{v.payroll_periods ? `${MONTH_NAMES[v.payroll_periods.period_month - 1]} ${v.payroll_periods.period_year}` : '—'}</td>
                    <td className="px-4 py-3 text-sm text-right text-slate-600">{formatXOF(v.gross_salary)}</td>
                    <td className="px-4 py-3 text-sm text-right text-error-600">-{formatXOF(v.cnss_employee)}</td>
                    <td className="px-4 py-3 text-sm text-right text-error-600">-{formatXOF(v.irpp_net || v.its_net || 0)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">{formatXOF(v.net_payable)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
