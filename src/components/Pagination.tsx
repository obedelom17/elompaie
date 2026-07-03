import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props { page: number; total: number; perPage: number; onChange: (p: number) => void }

export function Pagination({ page, total, perPage, onChange }: Props) {
  const pages = Math.ceil(total / perPage)
  if (pages <= 1) return null
  const range = Array.from({ length: pages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === pages || Math.abs(p - page) <= 1)

  return (
    <div className="pagination">
      <button onClick={() => onChange(page - 1)} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors">
        <ChevronLeft className="w-4 h-4" />
      </button>
      {range.map((p, i) => {
        const prev = range[i - 1]
        return (
          <span key={p} className="flex items-center gap-1">
            {prev && p - prev > 1 && <span className="text-slate-400 text-sm px-1">…</span>}
            <button onClick={() => onChange(p)} className={page === p ? 'active' : ''}>{p}</button>
          </span>
        )
      })}
      <button onClick={() => onChange(page + 1)} disabled={page === pages} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
