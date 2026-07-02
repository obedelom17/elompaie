import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Building2, Users, CalendarClock, TrendingUp, ArrowRight, Zap, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { CountUp } from '../components/ui/CountUp'
import { CardSkeleton } from '../components/ui/Skeleton'
import { formatXOF } from '../lib/payroll'

interface Stats { clientCount: number; employeeCount: number; openPeriods: number; closedPeriods: number; totalNetPay: number; totalEmployer: number }
interface RecentActivity { type: string; label: string; sub: string; time: string; color: string }

export default function Dashboard() {
  const { org } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentPeriods, setRecentPeriods] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (org) fetchStats() }, [org])

  const fetchStats = async () => {
    if (!org) return
    const { data: clients } = await supabase.from('clients').select('id').eq('organization_id', org.id)
    const clientIds = (clients || []).map(c => c.id)
    if (clientIds.length === 0) { setStats({ clientCount: 0, employeeCount: 0, openPeriods: 0, closedPeriods: 0, totalNetPay: 0, totalEmployer: 0 }); setLoading(false); return }

    const [empRes, openRes, closedRes, periodsRes] = await Promise.all([
      supabase.from('employees').select('id', { count: 'exact' }).in('client_id', clientIds).eq('active', true),
      supabase.from('payroll_periods').select('id', { count: 'exact' }).in('client_id', clientIds).eq('status', 'open'),
      supabase.from('payroll_periods').select('id', { count: 'exact' }).in('client_id', clientIds).eq('status', 'closed'),
      supabase.from('payroll_periods').select('*, clients(name)').in('client_id', clientIds).order('created_at', { ascending: false }).limit(5),
    ])

    const periodIds = [...(openRes.data || []), ...(closedRes.data || [])].map(p => p.id)
    let totalNet = 0, totalEmp = 0
    if (periodIds.length > 0) {
      const { data: vars } = await supabase.from('payroll_variables').select('net_payable, cnss_employer, inam_employer').in('period_id', periodIds).eq('status', 'calculated')
      totalNet = (vars || []).reduce((s, v) => s + (v.net_payable || 0), 0)
      totalEmp = (vars || []).reduce((s, v) => s + (v.cnss_employer || 0) + (v.inam_employer || 0), 0)
    }

    setStats({ clientCount: clientIds.length, employeeCount: empRes.count || 0, openPeriods: openRes.count || 0, closedPeriods: closedRes.count || 0, totalNetPay: totalNet, totalEmployer: totalEmp })
    setRecentPeriods(periodsRes.data || [])
    setLoading(false)
  }

  if (loading) return (
    <div className="space-y-6 page-enter">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
      </div>
    </div>
  )

  const statCards = [
    { label: 'Clients', value: stats!.clientCount, suffix: '', icon: Building2, to: '/clients', grad: 'from-blue-500 to-primary-600', bg: 'from-blue-50 to-primary-50' },
    { label: 'Employés actifs', value: stats!.employeeCount, suffix: '', icon: Users, to: '/employees', grad: 'from-violet-500 to-accent-600', bg: 'from-violet-50 to-accent-50' },
    { label: 'Périodes ouvertes', value: stats!.openPeriods, suffix: '', icon: CalendarClock, to: '/payroll', grad: 'from-amber-500 to-orange-500', bg: 'from-amber-50 to-orange-50' },
    { label: 'Net à payer', value: stats!.totalNetPay, suffix: ' F', icon: TrendingUp, to: '/payroll', grad: 'from-emerald-500 to-teal-500', bg: 'from-emerald-50 to-teal-50', isMoney: true },
  ]

  return (
    <div className="space-y-8 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tableau de bord</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse-soft inline-block"></span>
            {org?.name}
          </p>
        </div>
        <Link to="/payroll" className="btn-primary gap-2 shadow-glow-sm">
          <Zap className="w-4 h-4" /> Traiter une paie
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, i) => (
          <Link key={card.label} to={card.to}
            className={`stat-card group hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 stagger-${i + 1}`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${card.bg} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{card.label}</p>
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${card.grad} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                  <card.icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900 tabular-nums">
                {card.isMoney ? formatXOF(card.value) : <><CountUp value={card.value} />{card.suffix}</>}
              </p>
              <p className="text-xs text-primary-600 font-medium mt-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Voir <ArrowRight className="w-3 h-3" />
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Périodes récentes */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-primary-500" /> Périodes récentes
            </h2>
            <Link to="/payroll" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              Tout voir <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentPeriods.length === 0
            ? <div className="text-center py-10 text-slate-400">
                <CalendarClock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucune période créée.</p>
              </div>
            : <div className="space-y-2">
                {recentPeriods.map(p => (
                  <Link key={p.id} to={`/payroll/${p.id}`}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${p.status === 'open' ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                      {p.status === 'open'
                        ? <Clock className="w-5 h-5 text-amber-600" />
                        : <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm group-hover:text-primary-600 transition-colors">
                        {new Date(p.period_year, p.period_month - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-slate-500">{p.clients?.name}</p>
                    </div>
                    {p.status === 'open'
                      ? <span className="badge-warning">Ouverte</span>
                      : <span className="badge-success">Clôturée</span>
                    }
                  </Link>
                ))}
              </div>
          }
        </div>

        {/* Actions rapides */}
        <div className="card p-6">
          <h2 className="font-bold text-slate-900 mb-5 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary-500" /> Actions rapides
          </h2>
          <div className="space-y-2">
            {[
              { to: '/clients', icon: Building2, label: 'Nouveau client', sub: 'Ajouter une entreprise', color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
              { to: '/employees', icon: Users, label: 'Nouvel employé', sub: 'Enregistrer un salarié', color: 'text-violet-600 bg-violet-50 hover:bg-violet-100' },
              { to: '/payroll', icon: CalendarClock, label: 'Nouvelle période', sub: 'Ouvrir un mois de paie', color: 'text-amber-600 bg-amber-50 hover:bg-amber-100' },
              { to: '/salary-grids', icon: TrendingUp, label: 'Grilles salariales', sub: 'Gérer les barèmes', color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' },
            ].map(item => (
              <Link key={item.to} to={item.to}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group ${item.color}`}>
                <div className="w-9 h-9 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{item.label}</p>
                  <p className="text-xs opacity-70">{item.sub}</p>
                </div>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>

          {/* Résumé charges */}
          {stats!.totalEmployer > 0 && (
            <div className="mt-5 pt-5 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Charges patronales totales</p>
              <p className="text-2xl font-black text-slate-900">{formatXOF(stats!.totalEmployer)}</p>
              <p className="text-xs text-slate-400 mt-1">CNSS + INAM employeur</p>
            </div>
          )}
        </div>
      </div>

      {/* Alerte info légale */}
      <div className="card p-4 border-l-4 border-l-primary-500 bg-primary-50/50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-primary-900">Conformité CGI OTR 2025</p>
            <p className="text-xs text-primary-700 mt-0.5">
              Barème ITS annuel (Art. 74) · Abattement 28% (Art. 26) · Charges famille 10 000 F/pers/mois (Art. 73) · CNSS 4%+17,5% · INAM 5%+5%
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
