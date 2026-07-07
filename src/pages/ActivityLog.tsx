import { useEffect, useState } from 'react'
import { activityApi } from '../lib/api'
import { Activity, Clock } from 'lucide-react'

interface LogEntry { id: string; action: string; details: string | null; created_at: string; user_id: string }

export default function ActivityLog() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchLogs() }, [])

  const fetchLogs = async () => {
    try { setLogs(await activityApi.list()) } catch {} finally { setLoading(false) }
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  const actionColor = (action: string) => {
    if (action.includes('créé') || action.includes('import')) return 'bg-emerald-100 text-emerald-700'
    if (action.includes('supprim')) return 'bg-red-100 text-red-700'
    if (action.includes('clôtur') || action.includes('fermé')) return 'bg-blue-100 text-blue-700'
    return 'bg-slate-100 text-slate-600'
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Journal d'activité</h1>
        <p className="text-slate-500 mt-1">{logs.length} entrée{logs.length > 1 ? 's' : ''}</p>
      </div>
      <div className="card overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Aucune activité enregistrée.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {logs.map(log => (
              <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Activity className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{log.action}</p>
                  {log.details && <p className="text-xs text-slate-500 mt-0.5">{log.details}</p>}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${actionColor(log.action)}`}>{log.action.split(' ')[0]}</span>
                    <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(log.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
