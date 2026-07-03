import { useState, useEffect } from 'react'
import { Bell, X, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface Notif { id: string; title: string; body: string; type: 'warning' | 'success' | 'info'; read: boolean; created_at: string }

export function NotificationBadge() {
  const { org } = useAuth()
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notif[]>([])

  useEffect(() => { if (org) checkAlerts() }, [org])

  const checkAlerts = async () => {
    if (!org) return
    const alerts: Notif[] = []
    // Alertes CDD
    const { data: clients } = await supabase.from('clients').select('id').eq('organization_id', org.id)
    const ids = (clients || []).map(c => c.id)
    if (ids.length) {
      const { data: emps } = await supabase.from('employees').select('first_name, last_name, contract_end_date').in('client_id', ids).eq('contract_type', 'cdd').not('contract_end_date', 'is', null)
      const today = Date.now()
      ;(emps || []).forEach(e => {
        const days = Math.ceil((new Date(e.contract_end_date).getTime() - today) / 86400000)
        if (days >= 0 && days <= 30) {
          alerts.push({ id: `cdd-${e.last_name}`, title: 'CDD arrivant à terme', body: `${e.first_name} ${e.last_name} — dans ${days}j`, type: 'warning', read: false, created_at: new Date().toISOString() })
        }
      })
    }
    setNotifs(alerts)
  }

  const unread = notifs.filter(n => !n.read).length

  const IconMap = { warning: AlertTriangle, success: CheckCircle2, info: Info }
  const ColorMap = { warning: 'text-amber-600 bg-amber-50', success: 'text-emerald-600 bg-emerald-50', info: 'text-blue-600 bg-blue-50' }

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="relative p-2 rounded-xl hover:bg-white/10 transition-colors text-slate-300 hover:text-white">
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unread}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 animate-scale-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 text-sm">Notifications</h3>
            <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-slate-100"><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          {notifs.length === 0
            ? <p className="text-center text-sm text-slate-400 py-6">Aucune notification</p>
            : <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
                {notifs.map(n => {
                  const Icon = IconMap[n.type]
                  return (
                    <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer" onClick={() => setNotifs(ns => ns.map(x => x.id === n.id ? { ...x, read: true } : x))}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${ColorMap[n.type]}`}><Icon className="w-3.5 h-3.5" /></div>
                      <div><p className="text-xs font-semibold text-slate-800">{n.title}</p><p className="text-xs text-slate-500">{n.body}</p></div>
                      {!n.read && <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1" />}
                    </div>
                  )
                })}
              </div>
          }
        </div>
      )}
    </div>
  )
}
