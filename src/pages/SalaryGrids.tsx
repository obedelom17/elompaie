import { useEffect, useState } from 'react'
import { salaryGridsApi, clientsApi } from '../lib/api'
import { LayoutGrid, Plus, Pencil, Trash2, X } from 'lucide-react'
import { formatXOF } from '../lib/payroll'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/ui/Toast'

interface Grid { id: string; client_id: string; category: string; echelon: number; base_salary: number; hourly_rate: number; client_name?: string }
interface Client { id: string; name: string }

export default function SalaryGrids() {
  const { toasts, toast, dismiss } = useToast()
  const [grids, setGrids] = useState<Grid[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Grid | null>(null)
  const [deleting, setDeleting] = useState<Grid | null>(null)
  const [form, setForm] = useState({ client_id: '', category: '', echelon: 1, base_salary: 0, hourly_rate: 0 })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [g, c] = await Promise.all([salaryGridsApi.list(), clientsApi.list()])
      setGrids(g); setClients(c)
    } catch {} finally { setLoading(false) }
  }

  const openCreate = () => { setEditing(null); setForm({ client_id: clients[0]?.id||'', category: '', echelon: 1, base_salary: 0, hourly_rate: 0 }); setShowForm(true) }
  const openEdit = (g: Grid) => { setEditing(g); setForm({ client_id: g.client_id, category: g.category, echelon: g.echelon, base_salary: g.base_salary, hourly_rate: g.hourly_rate }); setShowForm(true) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editing) { await salaryGridsApi.update(editing.id, form); toast('Grille mise à jour', 'success') }
      else { await salaryGridsApi.create(form); toast('Grille créée', 'success') }
      setShowForm(false); fetchData()
    } catch (err: any) { toast(err.message, 'error') }
  }

  const handleDelete = async () => {
    if (!deleting) return
    await salaryGridsApi.delete(deleting.id)
    setDeleting(null); toast('Grille supprimée', 'info'); fetchData()
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>

  const groupedByClient = grids.reduce((acc, g) => {
    const key = g.client_name || g.client_id
    if (!acc[key]) acc[key] = []
    acc[key].push(g)
    return acc
  }, {} as Record<string, Grid[]>)

  return (
    <div className="space-y-6 page-enter">
      <ToastContainer toasts={toasts} dismiss={dismiss} />
      <ConfirmModal open={!!deleting} title="Supprimer la grille" message={`Supprimer cat. "${deleting?.category}" échelon ${deleting?.echelon} ?`} confirmLabel="Supprimer" danger onConfirm={handleDelete} onCancel={() => setDeleting(null)} />
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-black text-slate-900">Grilles salariales</h1><p className="text-slate-500 mt-1">{grids.length} entrée{grids.length > 1 ? 's' : ''}</p></div>
        <button onClick={openCreate} className="btn-primary" disabled={!clients.length}><Plus className="w-4 h-4" /> Nouvelle grille</button>
      </div>
      {!grids.length ? (
        <div className="card p-12 text-center"><LayoutGrid className="w-12 h-12 text-slate-200 mx-auto mb-3" /><p className="text-slate-500">Aucune grille salariale.</p></div>
      ) : Object.entries(groupedByClient).map(([clientName, clientGrids]) => (
        <div key={clientName} className="card overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200"><h3 className="font-semibold text-slate-900">{clientName}</h3></div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100">
              <th className="text-left py-3 px-5 text-xs font-semibold text-slate-400 uppercase">Catégorie</th>
              <th className="text-left py-3 px-5 text-xs font-semibold text-slate-400 uppercase">Échelon</th>
              <th className="text-right py-3 px-5 text-xs font-semibold text-slate-400 uppercase">Salaire de base</th>
              <th className="text-right py-3 px-5 text-xs font-semibold text-slate-400 uppercase">Taux horaire</th>
              <th className="py-3 px-5"></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {clientGrids.map(g => (
                <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-5 font-medium text-slate-900">{g.category}</td>
                  <td className="py-3 px-5 text-slate-600">{g.echelon}</td>
                  <td className="py-3 px-5 text-right font-mono text-slate-900">{formatXOF(g.base_salary)}</td>
                  <td className="py-3 px-5 text-right font-mono text-slate-600">{formatXOF(g.hourly_rate)}</td>
                  <td className="py-3 px-5">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(g)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleting(g)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">{editing ? 'Modifier la grille' : 'Nouvelle grille'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-xl hover:bg-slate-100"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="label">Client *</label>
                <select required value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})} className="input">
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Catégorie *</label><input required value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="input" placeholder="Agent · Cadre…" /></div>
                <div><label className="label">Échelon</label><input type="number" min="1" value={form.echelon} onChange={e => setForm({...form, echelon: Number(e.target.value)})} className="input" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Salaire de base (F CFA)</label><input type="number" min="0" value={form.base_salary || ''} onChange={e => setForm({...form, base_salary: Number(e.target.value)})} className="input" /></div>
                <div><label className="label">Taux horaire (F CFA)</label><input type="number" min="0" value={form.hourly_rate || ''} onChange={e => setForm({...form, hourly_rate: Number(e.target.value)})} className="input" /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Annuler</button>
                <button type="submit" className="btn-primary flex-1">{editing ? 'Mettre à jour' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
