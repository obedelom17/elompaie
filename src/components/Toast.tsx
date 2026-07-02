import { useEffect, useState, createContext, useContext, ReactNode, useCallback } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

interface Toast { id: string; type: 'success' | 'error' | 'info'; message: string }
interface ToastContextType { toast: (type: Toast['type'], message: string) => void }

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((type: Toast['type'], message: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast: t, onClose }: { toast: Toast; onClose: () => void }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])
  const icons = { success: CheckCircle2, error: XCircle, info: Info }
  const colors = { success: 'bg-emerald-600', error: 'bg-red-600', info: 'bg-primary-600' }
  const Icon = icons[t.type]
  return (
    <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-modal text-sm font-medium text-white ${colors[t.type]} transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span>{t.message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx.toast
}
