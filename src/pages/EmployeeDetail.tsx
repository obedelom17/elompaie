import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, User, CalendarClock } from 'lucide-react'
import { MONTH_NAMES, formatXOF } from '../lib/payroll'

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>()
  const [employee, setEmployee] = useState<any>(null)
  const [variables, setVariables] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (id) fetchData() }, [id])

  const fetchData = async () => {
    const { data: empData } = await supabase.from('employees').select('*, clients(name)').eq('id', id).maybeSingle()
    setEmployee(empData)
    if (empData) {
      const { data: varData } = await supabase.from('payroll_variables').select('*, payroll_periods(period_year, period_month, clients(name))').eq('employee_id', id).order('calculated_at', { ascending: false })
      setVariables(varData || [])
    }
    setLoading(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
  if (!employee) return <div className="text-center py-12"><p className="text-slate-500">Employé introuvable.</p><Link to="/employees" className="btn-primary mt-4 inline-flex">Retour</Link></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><Link to="/employees" className="btn-ghost"><ArrowLeft className="w-4 h-4" /> Retour</Link></div>
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
              <div><span className="text-slate-500">Statut:</span> <span className="font-medium">{employee.marital_status}</span></div>
              <div><span className="text-slate-500">Enfants:</span> <span className="font-medium">{employee.children_count}</span></div>
            </div>
          </div>
          <div>{employee.active ? <span className="badge-success">Actif</span> : <span className="badge-error">Inactif</span>}</div>
        </div>
      </div>
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
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">ITS</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Net à payer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {variables.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-900">{v.payroll_periods ? `${MONTH_NAMES[v.payroll_periods.period_month - 1]} ${v.payroll_periods.period_year}` : '—'}</td>
                    <td className="px-4 py-3 text-sm text-right text-slate-600">{formatXOF(v.gross_salary)}</td>
                    <td className="px-4 py-3 text-sm text-right text-error-600">-{formatXOF(v.cnss_employee)}</td>
                    <td className="px-4 py-3 text-sm text-right text-error-600">-{formatXOF(v.its_net)}</td>
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
