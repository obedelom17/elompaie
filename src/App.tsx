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
import Layout from './components/Layout'

function ProtectedRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
  if (!user) return <Navigate to="/auth" replace />
  return <Layout><Routes>
    <Route path="/" element={<Dashboard />} />
    <Route path="/clients" element={<Clients />} />
    <Route path="/clients/:id" element={<ClientDetail />} />
    <Route path="/employees" element={<Employees />} />
    <Route path="/employees/:id" element={<EmployeeDetail />} />
    <Route path="/salary-grids" element={<SalaryGrids />} />
    <Route path="/payroll" element={<PayrollPeriods />} />
    <Route path="/payroll/:periodId" element={<PayrollVariables />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Layout>
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
  return <Routes>
    <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
    <Route path="/*" element={<ProtectedRoutes />} />
  </Routes>
}

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>
}
