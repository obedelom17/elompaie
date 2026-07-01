import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Building2, Users, CalendarClock, TrendingUp, ArrowRight } from 'lucide-react'

interface Stats { clientCount: number; employeeCount: number; openPeriods: number; totalNetPay: number }

export default function Dashboard() {
  const { org } = useAuth()
  const [stats, setStats] = useState<Stats>({ clientCount: 0, employeeCount: 0, openPeriods: 0, totalNetPay: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (org) fetchStats() }, [org])

  const fetchStats = async () => {
    if (!org) return
    const { data: clients } = await supabase.from('clients').select('id').eq('organization_id', org.id)
    const clientIds = (clients || []).map((c) => c.id)
    if (clientIds.length === 0) { setLoading(false); return }
    const { data: employees } = await supabase.from('employees').select('id').in('client_id', clientIds).eq('active', true)
    const { data: periods } = await supabase.from('payroll_periods').select('id').in('client_id', clientIds).eq('status', 'open')
    const periodIds = (periods || []).map((p) => p.id)
    let totalNet = 0
    if (periodIds.length > 0) {
      const { data: variables } = await supabase.from('payroll_variables').select('net_payable').in('period_id', periodIds).eq('status', 'calculated')
      totalNet = (variables || []).reduce((sum, v) => sum + (v.net_payable || 0), 0)
    }
    setStats({ clientCount: clientIds.length, employeeCount: employees?.length || 0, openPeriods: periods?.length || 0, totalNetPay: totalNet })
    setLoading(false)
  }

  const cards = [
    { label: 'Clients', value: stats.clientCount, icon: Building2, to: '/clients', color: 'from-primary-500 to-primary-600' },
    { label: 'Employés actifs', value: stats.employeeCount, icon: Users, to: '/employees', color: 'from-accent-500 to-accent-600' },
    { label: 'Périodes ouvertes', value: stats.openPeriods, icon: CalendarClock, to: '/payroll', color: 'from-warning-500 to-warning-600' },
    { label: 'Net à payer', value: new Intl.NumberFormat('fr-FR').format(stats.totalNetPay) + ' F', icon: TrendingUp, to: '/payroll', color: 'from-success-500 to-success-600' },
  ]

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1><p className="text-slate-500 mt-1">Vue d'ensemble — {org?.name}</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link key={card.label} to={card.to} className="card p-5 hover:shadow-md transition-all group">
            <div className="flex items-start justify-between">
              <div><p className="text-sm text-slate-500">{card.label}</p><p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p></div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-sm`}><card.icon className="w-6 h-6 text-white" /></div>
            </div>
            <div className="flex items-center gap-1 text-sm text-primary-600 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">Voir <ArrowRight className="w-3 h-3" /></div>
          </Link>
        ))}
      </div>
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Link to="/clients" className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all"><Building2 className="w-5 h-5 text-primary-600" /><span className="text-sm font-medium text-slate-700">Gérer les clients</span></Link>
          <Link to="/employees" className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all"><Users className="w-5 h-5 text-primary-600" /><span className="text-sm font-medium text-slate-700">Gérer les employés</span></Link>
          <Link to="/payroll" className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all"><CalendarClock className="w-5 h-5 text-primary-600" /><span className="text-sm font-medium text-slate-700">Traiter une paie</span></Link>
        </div>
      </div>
    </div>
  )
}
