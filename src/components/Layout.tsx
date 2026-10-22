import { ReactNode, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Building2, Users, Grid3x3, CalendarClock,
  LogOut, Menu, Download, FlaskConical, X, Activity, Settings, Bot
} from 'lucide-react'
import { NotificationBadge } from './NotificationBadge'
import { LanguageSwitch } from './LanguageSwitch'
import { Logo } from './Logo'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { t, useLang } from '../lib/i18n'

const navItems = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/clients', label: 'Clients', icon: Building2 },
  { to: '/employees', label: 'Employés', icon: Users },
  { to: '/salary-grids', label: 'Grilles salariales', icon: Grid3x3 },
  { to: '/payroll', label: 'Périodes de paie', icon: CalendarClock },
  { to: '/assistant', label: 'ElomPaie AI', icon: Bot },
  { to: '/simulator', label: 'Simulateur', icon: FlaskConical },
  { to: '/export', label: 'Export & Rapports', icon: Download },
  { to: '/activity', label: 'Journal activité', icon: Activity },
  { to: '/settings', label: 'Paramètres', icon: Settings },
]

export default function Layout({ children }: { children: ReactNode }) {
  const { org, signOut } = useAuth()
  const { lang } = useLang()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  useKeyboardShortcuts()

  const handleSignOut = async () => { await signOut(); navigate('/auth') }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-60 flex flex-col bg-[#1E293B] border-r border-slate-800 transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center justify-between px-5 h-14 border-b border-white/10">
          <Logo size={26} light />
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 rounded-md hover:bg-white/10 text-slate-300" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto" key={lang}>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 pl-3 pr-3 py-2 rounded-md text-sm border-l-2 transition-colors ${
                  isActive
                    ? 'border-[#3B82F6] bg-white/10 text-white font-medium'
                    : 'border-transparent text-slate-300 hover:bg-white/5 hover:text-white'
                }`
              }>
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span>{t(item.label)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-white/10 space-y-2">
          <div className="px-3 py-1.5">
            <p className="text-xs text-slate-400">{t('Cabinet')}</p>
            <p className="text-sm font-medium text-white truncate">{org?.name || '—'}</p>
          </div>
          <button onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors w-full">
            <LogOut className="w-4 h-4" />
            {t('Déconnexion')}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between gap-3">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-md hover:bg-slate-100 transition-colors" aria-label="Menu">
            <Menu className="w-5 h-5 text-slate-700" />
          </button>
          <div className="hidden lg:block flex-1" />
          <div className="flex items-center gap-3 ml-auto">
            <LanguageSwitch />
            <NotificationBadge />
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">{children}</main>
      </div>

    </div>
  )
}
