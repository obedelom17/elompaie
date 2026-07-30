import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { Toast as ToastType } from '../../hooks/useToast'

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
}

const styles = {
  success: 'bg-emerald-600',
  error: 'bg-red-600',
  info: 'bg-primary-600',
  warning: 'bg-amber-500',
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

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-modal text-white text-sm font-medium max-w-sm transition-all duration-300 ${styles[toast.type]} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="flex-1">{toast.message}</span>
      <button onClick={() => dismiss(toast.id)} className="p-0.5 rounded-lg hover:bg-white/20 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
