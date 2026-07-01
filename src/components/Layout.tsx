import { ReactNode, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LayoutDashboard, Building2, Users, Grid3x3, CalendarClock, LogOut, Menu, Calculator } from 'lucide-react'

const navItems = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/clients', label: 'Clients', icon: Building2 },
  { to: '/employees', label: 'Employés', icon: Users },
  { to: '/salary-grids', label: 'Grilles salariales', icon: Grid3x3 },
  { to: '/payroll', label: 'Périodes de paie', icon: CalendarClock },
]

export default function Layout({ children }: { children: ReactNode }) {
  const { org, signOut } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSignOut = async () => { await signOut(); navigate('/auth') }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {sidebarOpen && <div className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-slate-900 text-slate-100 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center"><Calculator className="w-5 h-5 text-white" /></div>
          <div><h1 className="text-lg font-bold text-white">ObedPaie</h1><p className="text-xs text-slate-400">Gestion de paie</p></div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
              <item.icon className="w-5 h-5 flex-shrink-0" />{item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-slate-800">
          <div className="px-3 py-2 mb-2"><p className="text-xs text-slate-400">Cabinet</p><p className="text-sm font-medium text-white truncate">{org?.name || '—'}</p></div>
          <button onClick={handleSignOut} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-error-600 hover:text-white transition-all w-full"><LogOut className="w-5 h-5" />Déconnexion</button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-slate-100"><Menu className="w-5 h-5" /></button>
          <div className="flex items-center gap-2"><Calculator className="w-5 h-5 text-primary-600" /><span className="font-bold text-slate-900">ObedPaie</span></div>
        </header>
        <main className="flex-1 p-4 lg:p-8 page-enter">{children}</main>
      </div>
    </div>
  )
}
