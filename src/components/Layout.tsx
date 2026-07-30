import { ReactNode, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Building2, Users, Grid3x3, CalendarClock,
  LogOut, Menu, Calculator, Download, FlaskConical, X, ChevronRight,
  Activity, Settings, Sparkles
} from 'lucide-react'
import { AIChatbot } from './AIChatbot'
import { NotificationBadge } from './NotificationBadge'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'

const navItems = [
  { to: '/',            label: 'Tableau de bord',  icon: LayoutDashboard, end: true },
  { to: '/clients',     label: 'Clients',           icon: Building2 },
  { to: '/employees',   label: 'Employés',          icon: Users },
  { to: '/salary-grids',label: 'Grilles salariales',icon: Grid3x3 },
  { to: '/payroll',     label: 'Périodes de paie',  icon: CalendarClock },
  { to: '/simulator',   label: 'Simulateur',        icon: FlaskConical },
  { to: '/export',      label: 'Export & Rapports', icon: Download },
  { to: '/activity',    label: 'Journal activité',  icon: Activity },
  { to: '/settings',    label: 'Paramètres',        icon: Settings },
]

export default function Layout({ children }: { children: ReactNode }) {
  const { org, signOut } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  useKeyboardShortcuts()

  const handleSignOut = async () => { await signOut(); navigate('/auth') }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--grad-bg)', backgroundAttachment: 'fixed' }}>

      {/* Ambient background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div style={{
          position: 'absolute', width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
          top: -150, left: -100,
        }} />
        <div style={{
          position: 'absolute', width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)',
          top: '40%', right: -100,
        }} />
        <div style={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 70%)',
          bottom: -80, left: '35%',
        }} />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 flex flex-col transition-transform duration-300 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{
          background: 'rgba(15,5,40,0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--grad-accent)', boxShadow: '0 4px 16px rgba(168,85,247,0.45)' }}
            >
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-black text-white tracking-tight">ElomPaie</h1>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Gestion de paie · Togo</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden btn-icon" style={{ padding: 6 }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'text-white'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`
              }
              style={({ isActive }) => isActive ? {
                background: 'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(168,85,247,0.25) 100%)',
                border: '1px solid rgba(168,85,247,0.3)',
                boxShadow: '0 2px 12px rgba(168,85,247,0.15)',
              } : undefined}
            >
              {({ isActive }) => (
                <>
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200"
                    style={isActive
                      ? { background: 'var(--grad-accent)', boxShadow: '0 2px 10px rgba(168,85,247,0.4)' }
                      : { background: 'rgba(255,255,255,0.06)' }
                    }
                  >
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-violet-300" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Shortcut hints */}
        <div className="px-4 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.2)', lineHeight: 1.6 }}>
            Ctrl+K Employés · Ctrl+N Paie · Ctrl+D Accueil
          </p>
        </div>

        {/* Org + logout */}
        <div className="px-3 py-4 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-3 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Cabinet</p>
            <p className="text-sm font-semibold text-white truncate mt-0.5">{org?.name || '—'}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.15)'
              ;(e.currentTarget as HTMLElement).style.color = '#f87171'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'
            }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <LogOut className="w-4 h-4" />
            </div>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ── CONTENT ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0" style={{ position: 'relative', zIndex: 1 }}>
        {/* Topbar */}
        <header
          className="sticky top-0 z-20 px-4 py-3 flex items-center justify-between"
          style={{
            background: 'rgba(15,5,40,0.7)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden btn-icon">
            <Menu className="w-5 h-5" />
          </button>
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--grad-accent)' }}>
              <Calculator className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-white">ElomPaie</span>
          </div>
          <div className="hidden lg:block flex-1" />
          <div className="flex items-center gap-2">
            <NotificationBadge />
          </div>
        </header>

        <main className="flex-1 p-5 lg:p-8 page-enter overflow-auto">{children}</main>
      </div>

      <AIChatbot />
    </div>
  )
}
