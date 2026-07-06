import { AlertTriangle, X } from 'lucide-react'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({ open, title, message, confirmLabel = 'Confirmer', danger = false, onConfirm, onCancel }: Props) {
  if (!open) return null
  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal max-w-md p-6">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-100' : 'bg-amber-100'}`}>
            <AlertTriangle className={`w-6 h-6 ${danger ? 'text-red-600' : 'text-amber-600'}`} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-900 text-lg">{title}</h3>
            <p className="text-slate-500 text-sm mt-1">{message}</p>
          </div>
          <button onClick={onCancel} className="btn-icon text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} className="btn-secondary flex-1">Annuler</button>
          <button onClick={onConfirm} className={`flex-1 btn ${danger ? 'btn-danger' : 'btn-primary'}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
