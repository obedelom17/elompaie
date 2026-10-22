import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import Employees from './pages/Employees'
import EmployeeDetail from './pages/EmployeeDetail'
import SalaryGrids from './pages/SalaryGrids'
import PayrollPeriods from './pages/PayrollPeriods'
import PayrollVariables from './pages/PayrollVariables'
import Simulator from './pages/Simulator'
import ExportReports from './pages/ExportReports'
import ActivityLog from './pages/ActivityLog'
import Settings from './pages/Settings'
import Layout from './components/Layout'
import { LogoMark } from './components/Logo'
import { useLang } from './lib/i18n'

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
      <Routes key={lang}>
        <Route path="/" element={<Dashboard />} />
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
