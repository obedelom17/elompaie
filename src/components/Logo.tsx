/**
 * Marque ElomPaie : un E composé de trois lignes de registre.
 * La ligne centrale, en or, joue le rôle du total.
 */
export function LogoMark({ size = 32, className = '', bg = '#1f4e79' }: { size?: number; className?: string; bg?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} role="img" aria-label="ElomPaie">
      <rect width="48" height="48" rx="9" fill={bg} />
      <rect x="14" y="11" width="6" height="26" fill="#f4f1e8" />
      <rect x="14" y="11" width="21" height="6" fill="#f4f1e8" />
      <rect x="14" y="21" width="16" height="6" fill="#f59e0b" />
      <rect x="14" y="31" width="21" height="6" fill="#f4f1e8" />
    </svg>
  )
}

export function Logo({ size = 28, light = false }: { size?: number; light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} bg={light ? '#2a9d8f' : '#1f4e79'} />
      <span className={`text-[17px] font-semibold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>ElomPaie</span>
    </span>
  )
}
