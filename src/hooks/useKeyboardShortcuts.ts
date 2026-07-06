import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function useKeyboardShortcuts() {
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (!ctrl) return
      // Ctrl+K → go to employees (search)
      if (e.key === 'k') { e.preventDefault(); navigate('/employees') }
      // Ctrl+N → new payroll period
      if (e.key === 'n') { e.preventDefault(); navigate('/payroll') }
      // Ctrl+D → dashboard
      if (e.key === 'd') { e.preventDefault(); navigate('/') }
      // Ctrl+E → export
      if (e.key === 'e') { e.preventDefault(); navigate('/export') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])
}
