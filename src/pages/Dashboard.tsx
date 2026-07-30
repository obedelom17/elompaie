import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { clientsApi, employeesApi, payrollApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import {
  Building2, Users, CalendarClock, TrendingUp, ArrowRight,
  Zap, CheckCircle2, Clock, Rocket, Sparkles
} from 'lucide-react'
import { CountUp } from '../components/ui/CountUp'
import { CardSkeleton } from '../components/ui/Skeleton'
import { formatXOF } from '../lib/payroll'
import { Onboarding } from '../components/Onboarding'

interface Stats {
  clientCount: number; employeeCount: number
  openPeriods: number; closedPeriods: number
  totalNetPay: number; totalEmployer: number
}

const GlowOrb = ({ color, size, top, left, right, bottom, opacity = 0.15 }: any) => (
  <div style={{
    position: 'absolute', width: size, height: size, borderRadius: '50%', pointerEvents: 'none',
    background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
    top, left, right, bottom, opacity,
  }} />
)

export default function Dashboard() {
  const { org } = useAuth()
  const [stats, setStats] = useState<Stats>({ clientCount:0, employeeCount:0, openPeriods:0, closedPeriods:0, totalNetPay:0, totalEmployer:0 })
  const [recentPeriods, setRecentPeriods] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    try {
      const [clients, employees, periods] = await Promise.all([
        clientsApi.list(), employeesApi.list(), payrollApi.listPeriods(),
      ])
      setStats({
        clientCount: clients.length,
        employeeCount: employees.filter((e: any) => e.active).length,
        openPeriods: periods.filter((p: any) => p.status === 'open').length,
        closedPeriods: periods.filter((p: any) => p.status === 'closed').length,
        totalNetPay: 0, totalEmployer: 0,
      })
      setRecentPeriods(periods.slice(0, 5))
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  if (loading) return (
    <div className="space-y-6 page-enter">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
      </div>
    </div>
  )

  const statCards = [
    {
      label: 'Clients', value: stats.clientCount, icon: Building2, to: '/clients',
      color: '#6366f1', glow: 'rgba(99,102,241,0.4)',
    },
    {
      label: 'Employés actifs', value: stats.employeeCount, icon: Users, to: '/employees',
      color: '#a855f7', glow: 'rgba(168,85,247,0.4)',
    },
    {
      label: 'Périodes ouvertes', value: stats.openPeriods, icon: CalendarClock, to: '/payroll',
      color: '#ec4899', glow: 'rgba(236,72,153,0.4)',
    },
    {
      label: 'Périodes clôturées', value: stats.closedPeriods, icon: CheckCircle2, to: '/payroll',
      color: '#8b5cf6', glow: 'rgba(139,92,246,0.4)',
    },
  ]

  const quickLinks = [
    { to: '/clients',   icon: Building2,    label: 'Nouveau client',  sub: 'Ajouter une entreprise', accent: '#6366f1' },
    { to: '/employees', icon: Users,         label: 'Nouvel employé',  sub: 'Enregistrer un salarié', accent: '#a855f7' },
    { to: '/payroll',   icon: CalendarClock, label: 'Nouvelle période',sub: 'Ouvrir un mois de paie', accent: '#ec4899' },
    { to: '/simulator', icon: Zap,           label: 'Simulateur',      sub: 'Calculer une paie',       accent: '#8b5cf6' },
  ]

  return (
    <div className="space-y-8 page-enter">
      {showOnboarding && <Onboarding onDone={() => { setShowOnboarding(false); fetchStats() }} />}

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="accent-dot" />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {org?.name}
            </span>
          </div>
          <h1 className="section-title">Tableau de bord</h1>
          <p className="section-sub">Vue d'ensemble de votre activité paie</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {stats.clientCount === 0 && (
            <button onClick={() => setShowOnboarding(true)} className="btn btn-secondary">
              <Rocket className="w-4 h-4" /> Démarrage
            </button>
          )}
          <Link to="/payroll" className="btn btn-primary">
            <Zap className="w-4 h-4" /> Traiter une paie
          </Link>
        </div>
      </div>

      {/* ── Onboarding banner ── */}
      {stats.clientCount === 0 && (
        <div className="glass p-6" style={{ border: '1px solid rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.08)' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.3))' }}>
              <Sparkles className="w-6 h-6 text-violet-300" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white">Bienvenue sur ElomPaie !</h3>
              <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Créez un client, ajoutez un employé, puis ouvrez une période de paie.
              </p>
            </div>
            <button onClick={() => setShowOnboarding(true)} className="btn btn-primary flex-shrink-0">
              Démarrer <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, i) => (
          <Link key={card.label} to={card.to} className={`glass glass-hover p-7 relative overflow-hidden block stagger-${i+1}`}>
            <GlowOrb color={card.color} size={200} top={-60} right={-60} opacity={0.12} />
            <div className="relative">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: `linear-gradient(135deg, ${card.color}55, ${card.color}88)`, boxShadow: `0 4px 16px ${card.glow}` }}
              >
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <p style={{ fontSize: 38, fontWeight: 800, color: 'white', letterSpacing: '-0.02em', lineHeight: 1 }}>
                <CountUp value={card.value} />
              </p>
              <p className="mt-2" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                {card.label}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Main content grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Périodes récentes */}
        <div className="lg:col-span-2 glass p-7">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-white" style={{ fontSize: 16 }}>Périodes récentes</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Activité de paie</p>
            </div>
            <Link to="/payroll" className="btn btn-ghost" style={{ fontSize: 13, padding: '6px 12px' }}>
              Tout voir <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentPeriods.length === 0 ? (
            <div className="text-center py-12">
              <CalendarClock className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>Aucune période créée.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentPeriods.map(p => (
                <Link key={p.id} to={`/payroll/${p.id}`}
                  className="flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 group"
                  style={{ borderRadius: 14 }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: p.status === 'open' ? 'rgba(251,191,36,0.15)' : 'rgba(74,222,128,0.15)' }}>
                    {p.status === 'open'
                      ? <Clock className="w-5 h-5" style={{ color: '#fbbf24' }} />
                      : <CheckCircle2 className="w-5 h-5" style={{ color: '#4ade80' }} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm">
                      {new Date(p.period_year, p.period_month - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{p.client_name}</p>
                  </div>
                  {p.status === 'open'
                    ? <span className="badge-warning">Ouverte</span>
                    : <span className="badge-success">Clôturée</span>
                  }
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'rgba(168,85,247,0.8)' }} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Actions rapides */}
        <div className="glass p-7">
          <h2 className="font-bold text-white mb-1" style={{ fontSize: 16 }}>Actions rapides</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>Raccourcis fréquents</p>
          <div className="space-y-2">
            {quickLinks.map(item => (
              <Link key={item.to} to={item.to}
                className="flex items-center gap-3 p-3.5 rounded-2xl group transition-all duration-200"
                style={{ borderRadius: 14 }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'
                  ;(e.currentTarget as HTMLElement).style.borderColor = `${item.accent}55`
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'transparent'
                }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200"
                  style={{ background: `${item.accent}22` }}>
                  <item.icon className="w-4.5 h-4.5" style={{ width: 18, height: 18, color: item.accent }} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white text-sm">{item.label}</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 1 }}>{item.sub}</p>
                </div>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: item.accent }} />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Conformité banner ── */}
      <div className="glass p-4" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(99,102,241,0.2)' }}>
            <CheckCircle2 className="w-4 h-4" style={{ color: '#a5b4fc' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#c7d2fe' }}>Conformité CGI OTR 2025</p>
            <p style={{ fontSize: 12, color: 'rgba(199,210,254,0.6)', marginTop: 1 }}>
              CNSS 4% + 17,5% · AMU 5% + 5% · IRPP selon barème annualisé
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
