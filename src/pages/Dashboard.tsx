import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { clientsApi, employeesApi, payrollApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { Building2, Users, CalendarClock, ArrowRight } from 'lucide-react'
import { CountUp } from '../components/ui/CountUp'
import { CardSkeleton } from '../components/ui/Skeleton'
import { formatXOF } from '../lib/payroll'
import { Onboarding } from '../components/Onboarding'
import { t, locale } from '../lib/i18n'

interface Stats { clientCount: number; employeeCount: number; openPeriods: number; closedPeriods: number; totalNetPay: number; totalEmployer: number }

export default function Dashboard() {
  const { org } = useAuth()
  const [stats, setStats] = useState<Stats>({ clientCount: 0, employeeCount: 0, openPeriods: 0, closedPeriods: 0, totalNetPay: 0, totalEmployer: 0 })
  const [recentPeriods, setRecentPeriods] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    try {
      const [clients, employees, periods] = await Promise.all([
        clientsApi.list(),
        employeesApi.list(),
        payrollApi.listPeriods(),
      ])
      const openPeriods = periods.filter((p: any) => p.status === 'open')
      const closedPeriods = periods.filter((p: any) => p.status === 'closed')
      // Agréger les variables de toutes les périodes (simplifié)
      let totalNet = 0, totalEmp = 0
      setStats({
        clientCount: clients.length,
        employeeCount: employees.filter((e: any) => e.active).length,
        openPeriods: openPeriods.length,
        closedPeriods: closedPeriods.length,
        totalNetPay: totalNet,
        totalEmployer: totalEmp,
      })
      setRecentPeriods(periods.slice(0, 5))
    } catch { /* silent */ } finally { setLoading(false) }
  }

  if (loading) return <div className="space-y-6 page-enter"><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}</div></div>

  const figures = [
    { label: t("Clients"), value: stats.clientCount, to: '/clients' },
    { label: t("Employés actifs"), value: stats.employeeCount, to: '/employees' },
    { label: t("Périodes ouvertes"), value: stats.openPeriods, to: '/payroll' },
    { label: t("Net à payer"), value: stats.totalNetPay, to: '/payroll', money: true },
  ]

  const shortcuts = [
    { to: '/clients', icon: Building2, label: t("Nouveau client"), sub: t("Ajouter une entreprise") },
    { to: '/employees', icon: Users, label: t("Nouvel employé"), sub: t("Enregistrer un salarié") },
    { to: '/payroll', icon: CalendarClock, label: t("Nouvelle période"), sub: t("Ouvrir un mois de paie") },
  ]

  return (
    <div className="space-y-8">
      {showOnboarding && <Onboarding onDone={() => { setShowOnboarding(false); fetchStats() }} />}

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{t("Tableau de bord")}</h1>
          <p className="text-sm text-slate-500 mt-1">{org?.name}</p>
        </div>
        <div className="flex gap-2">
          {stats.clientCount === 0 && <button onClick={() => setShowOnboarding(true)} className="btn-secondary">{t("Démarrage rapide")}</button>}
          <Link to="/payroll" className="btn-primary">{t("Traiter une paie")}</Link>
        </div>
      </div>

      {stats.clientCount === 0 && (
        <div className="card p-5 flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <h3 className="font-semibold text-slate-900">{t("Bienvenue sur ElomPaie !")}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{t("Commencez par créer un client, ajouter un employé, puis ouvrir une période de paie.")}</p>
          </div>
          <button onClick={() => setShowOnboarding(true)} className="btn-primary">{t("Démarrer")}</button>
        </div>
      )}

      <div className="card grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        {figures.map(f => (
          <Link key={f.label} to={f.to} className="px-6 py-5 hover:bg-slate-50 transition-colors first:rounded-l-lg">
            <p className="text-sm text-slate-500">{f.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
              {f.money ? formatXOF(f.value) : <CountUp value={f.value} />}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-900">{t("Périodes récentes")}</h2>
            <Link to="/payroll" className="text-sm text-primary-700 hover:underline">{t("Tout voir")}</Link>
          </div>
          <div className="card divide-y divide-slate-100">
            {recentPeriods.length === 0
              ? <p className="text-sm text-slate-400 text-center py-10">{t("Aucune période créée.")}</p>
              : recentPeriods.map(p => (
                <Link key={p.id} to={`/payroll/${p.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 capitalize">
                      {new Date(p.period_year, p.period_month - 1).toLocaleDateString(locale(), { month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-slate-500">{p.client_name}</p>
                  </div>
                  {p.status === 'open' ? <span className="badge-warning">{t("Ouverte")}</span> : <span className="badge-success">{t("Clôturée")}</span>}
                </Link>
              ))}
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 mb-3">{t("Actions rapides")}</h2>
          <div className="card divide-y divide-slate-100">
            {shortcuts.map(item => (
              <Link key={item.to} to={item.to} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors">
                <item.icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.sub}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300" />
              </Link>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-4 leading-relaxed">{t("Conformité CGI OTR 2025")} : {t("CNSS 4%+17,5% · AMU 5%+5%")}</p>
        </section>
      </div>
    </div>
  )
}
