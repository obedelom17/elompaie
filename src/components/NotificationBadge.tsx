import { useState, useEffect } from 'react'
import { Bell, X, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { employeesApi } from '../lib/api'

interface Notif { id: string; title: string; body: string; type: 'warning' | 'success' | 'info'; read: boolean }

export function NotificationBadge() {
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notif[]>([])

  useEffect(() => { checkAlerts() }, [])

  const checkAlerts = async () => {
    try {
      const emps = await employeesApi.list()
      const alerts: Notif[] = []
      const today = Date.now()
      emps.forEach((e: any) => {
        if (e.contract_type === 'cdd' && e.contract_end_date) {
          const days = Math.ceil((new Date(e.contract_end_date).getTime() - today) / 86400000)
          if (days >= 0 && days <= 30) {
            alerts.push({ id: `cdd-${e.id}`, title: 'CDD arrivant à terme', body: `${e.first_name} ${e.last_name} — dans ${days}j`, type: 'warning', read: false })
          }
        }
      })
      setNotifs(alerts)
    } catch {}
  }

  const unread = notifs.filter(n => !n.read).length
  const IconMap = { warning: AlertTriangle, success: CheckCircle2, info: Info }
  const ColorMap = { warning: 'text-amber-600 bg-amber-50', success: 'text-emerald-600 bg-emerald-50', info: 'text-blue-600 bg-blue-50' }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="p-2 rounded-xl hover:bg-slate-100 relative transition-colors">
        <Bell className="w-5 h-5 text-slate-600" />
        {unread > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-40 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="font-semibold text-slate-900 text-sm">Notifications</span>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifs.length === 0 ? (
                <div className="text-center py-8"><Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" /><p className="text-slate-400 text-sm">Aucune notification</p></div>
              ) : notifs.map(n => {
                const Icon = IconMap[n.type]
                return (
                  <div key={n.id} className={`flex gap-3 px-4 py-3 border-b border-slate-50 ${ColorMap[n.type]}`}>
                    <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div><p className="text-xs font-semibold">{n.title}</p><p className="text-xs opacity-80">{n.body}</p></div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
