import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AuthPage from './pages/AuthPage'
import Layout from './components/Layout'
import { LogoMark } from './components/Logo'
import { useLang } from './lib/i18n'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Clients = lazy(() => import('./pages/Clients'))
const ClientDetail = lazy(() => import('./pages/ClientDetail'))
const Employees = lazy(() => import('./pages/Employees'))
const EmployeeDetail = lazy(() => import('./pages/EmployeeDetail'))
const SalaryGrids = lazy(() => import('./pages/SalaryGrids'))
const PayrollPeriods = lazy(() => import('./pages/PayrollPeriods'))
const PayrollVariables = lazy(() => import('./pages/PayrollVariables'))
const Simulator = lazy(() => import('./pages/Simulator'))
const ExportReports = lazy(() => import('./pages/ExportReports'))
const ActivityLog = lazy(() => import('./pages/ActivityLog'))
const Settings = lazy(() => import('./pages/Settings'))
const AIChatbot = lazy(() => import('./components/AIChatbot').then(m => ({ default: m.AIChatbot })))

function ProtectedRoutes() {
  const { user, loading } = useAuth()
  const { lang } = useLang()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <LogoMark size={44} />
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-200 border-t-primary-600"></div>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/auth" replace />
  return (
    <Layout>
      <Suspense fallback={<div className="flex justify-center py-24"><div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-200 border-t-accent-600" /></div>}>
      <Routes key={lang}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/assistant" element={<AIChatbot />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/:id" element={<ClientDetail />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/employees/:id" element={<EmployeeDetail />} />
        <Route path="/salary-grids" element={<SalaryGrids />} />
        <Route path="/payroll" element={<PayrollPeriods />} />
        <Route path="/payroll/:periodId" element={<PayrollVariables />} />
        <Route path="/simulator" element={<Simulator />} />
        <Route path="/export" element={<ExportReports />} />
        <Route path="/activity" element={<ActivityLog />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </Layout>
  )
}

function AppRoutes() {
  const { user, loading } = useAuth()
  const { lang } = useLang()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-200 border-t-primary-600"></div>
    </div>
  )
  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage key={lang} />} />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  )
}

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>
}
