import { ReactNode } from 'react'

/** Titre de section : numéro facultatif, libellé en capitales, filet fin. */
export function SectionTitle({ children, index, className = 'mb-4' }: { children: ReactNode; index?: number; className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {index !== undefined && <span className="text-xs font-semibold tabular-nums text-accent-600">{String(index).padStart(2, '0')}</span>}
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{children}</h3>
      <span className="flex-1 h-px bg-slate-200" aria-hidden />
    </div>
  )
}

/** Ligne de bulletin : libellé, pointillés, montant. */
export function LeaderRow({ label, children, bold, muted, className = '' }: { label: ReactNode; children: ReactNode; bold?: boolean; muted?: boolean; className?: string }) {
  return (
    <div className={`flex items-baseline gap-2 py-1.5 ${bold ? 'font-semibold' : ''} ${className}`}>
      <span className={muted ? 'text-slate-500' : 'text-slate-700'}>{label}</span>
      <span className="flex-1 border-b border-dotted border-slate-300 translate-y-[-3px]" aria-hidden />
      <span className="tabular-nums text-slate-900">{children}</span>
    </div>
  )
}
