import { AlertTriangle } from 'lucide-react'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({ open, title, message, confirmLabel = 'Confirmer', danger, onConfirm, onCancel }: Props) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal max-w-md p-7" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: danger ? 'rgba(239,68,68,0.2)' : 'rgba(251,191,36,0.2)' }}
          >
            <AlertTriangle className="w-6 h-6" style={{ color: danger ? '#f87171' : '#fbbf24' }} />
          </div>
          <div>
            <h3 className="font-bold text-white" style={{ fontSize: 16 }}>{title}</h3>
            <p className="mt-1" style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>{message}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn btn-secondary flex-1">Annuler</button>
          <button onClick={onConfirm} className={`btn flex-1 ${danger ? 'btn-danger' : 'btn-primary'}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
