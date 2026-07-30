import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { Toast as ToastType } from '../../hooks/useToast'

const icons = { success: CheckCircle, error: XCircle, info: Info, warning: AlertTriangle }
const colors: Record<string, string> = {
  success: 'rgba(22,163,74,0.88)',
  error:   'rgba(220,38,38,0.88)',
  info:    'rgba(99,102,241,0.88)',
  warning: 'rgba(217,119,6,0.88)',
}

export function ToastContainer({ toasts, dismiss }: { toasts: ToastType[]; dismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2">
      {toasts.map(t => <ToastItem key={t.id} toast={t} dismiss={dismiss} />)}
    </div>
  )
}

function ToastItem({ toast, dismiss }: { toast: ToastType; dismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false)
  const Icon = icons[toast.type]
  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])
  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-white text-sm font-medium max-w-sm transition-all duration-300"
      style={{
        background: colors[toast.type],
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.15)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
      }}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="flex-1">{toast.message}</span>
      <button onClick={() => dismiss(toast.id)} style={{ padding: 3, borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: 'white', display: 'flex' }}>
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
