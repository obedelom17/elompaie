import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Grid3x3, Plus, Pencil, Trash2, X, Building2 } from 'lucide-react'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { formatXOF } from '../lib/payroll'

interface SalaryGrid { id: string; client_id: string; category: string; echelon: number; base_salary: number; hourly_rate: number; clients?: { name: string } | null }
interface Client { id: string; name: string }

export default function SalaryGrids() {
  const { org } = useAuth()
  const [grids, setGrids] = useState<SalaryGrid[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [filterClient, setFilterClient] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<SalaryGrid | null>(null)
  const [form, setForm] = useState({ client_id: '', category: '', echelon: 1, base_salary: 0, hourly_rate: 0 })

  useEffect(() => { if (org) fetchData() }, [org])

  const fetchData = async () => {
    if (!org) return
    const { data: clientData } = await supabase.from('clients').select('id, name').eq('organization_id', org.id).order('name')
    setClients(clientData || [])
    const clientIds = (clientData || []).map((c) => c.id)
    if (clientIds.length === 0) { setLoading(false); return }
    const { data: gridData } = await supabase.from('salary_grids').select('*, clients(name)').in('client_id', clientIds).order('category, echelon')
    setGrids(gridData || [])
    setLoading(false)
  }

  const openCreate = () => { setEditing(null); setForm({ client_id: clients[0]?.id || '', category: '', echelon: 1, base_salary: 0, hourly_rate: 0 }); setShowForm(true) }
  const openEdit = (grid: SalaryGrid) => { setEditing(grid); setForm({ client_id: grid.client_id, category: grid.category, echelon: grid.echelon, base_salary: grid.base_salary, hourly_rate: grid.hourly_rate }); setShowForm(true) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...form, echelon: Number(form.echelon), base_salary: Number(form.base_salary), hourly_rate: Number(form.hourly_rate) }
    if (editing) await supabase.from('salary_grids').update(payload).eq('id', editing.id)
    else await supabase.from('salary_grids').insert(payload)
    setShowForm(false); fetchData()
  }

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!deletingId) return
    await supabase.from('salary_grids').delete().eq('id', deletingId)
    setDeletingId(null); fetchData()
  }

  const filtered = grids.filter((g) => filterClient === 'all' || g.client_id === filterClient)

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>

  return (
    <div className="space-y-6">
      <ConfirmModal open={!!deletingId} title="Supprimer cette grille" message="Supprimer cette grille salariale ?" confirmLabel="Supprimer" danger onConfirm={handleDelete} onCancel={() => setDeletingId(null)} />
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-bold text-slate-900">Grilles salariales</h1><p className="text-slate-500 mt-1">Barèmes de base par catégorie et échelon</p></div>
        <button onClick={openCreate} className="btn-primary" disabled={clients.length === 0}><Plus className="w-4 h-4" /> Nouvelle grille</button>
      </div>
      {clients.length === 0 ? (
        <div className="card p-12 text-center"><Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Créez d'abord un client.</p></div>
      ) : (
        <>
          <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className="input max-w-[250px]"><option value="all">Tous les clients</option>{clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select>
          {filtered.length === 0 ? (
            <div className="card p-12 text-center"><Grid3x3 className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Aucune grille salariale.</p></div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Client</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Catégorie</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Échelon</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Salaire de base</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Taux (h/mois)</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((grid) => (
                      <tr key={grid.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-600">{grid.clients?.name || '—'}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{grid.category}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{grid.echelon}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">{formatXOF(grid.base_salary)}</td>
                        <td className="px-4 py-3 text-sm text-right text-slate-600">{grid.hourly_rate} h</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => openEdit(grid)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => setDeletingId(grid.id)} className="p-1.5 rounded-lg hover:bg-error-50 text-slate-500 hover:text-error-600"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">{editing ? 'Modifier la grille' : 'Nouvelle grille salariale'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="label">Client *</label><select required value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className="input">{clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Catégorie *</label><input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input" placeholder="Cadre, Employé..." /></div>
                <div><label className="label">Échelon</label><input type="number" min="1" value={form.echelon} onChange={(e) => setForm({ ...form, echelon: Number(e.target.value) })} className="input" /></div>
              </div>
              <div><label className="label">Salaire de base mensuel (FCFA) *</label><input type="number" min="0" required value={form.base_salary} onChange={(e) => setForm({ ...form, base_salary: Number(e.target.value) })} className="input" /></div>
              <div><label className="label">Taux horaire (h/mois)</label><input type="number" min="0" step="0.01" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: Number(e.target.value) })} className="input" /></div>
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
