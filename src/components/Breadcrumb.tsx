import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

interface Crumb { label: string; to?: string }

export function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav className="breadcrumb">
      <Link to="/"><Home className="w-3 h-3" /></Link>
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight className="w-3 h-3 sep" />
          {c.to && i < crumbs.length - 1
            ? <Link to={c.to}>{c.label}</Link>
            : <span className="current">{c.label}</span>
          }
        </span>
      ))}
    </nav>
  )
}
