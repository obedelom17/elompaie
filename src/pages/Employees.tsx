import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Users, Plus, Search, Pencil, Trash2, X, Building2, Filter } from 'lucide-react'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/ui/Toast'

interface Employee { id: string; matricule: string | null; first_name: string; last_name: string; gender: string | null; position: string | null; category: string | null; marital_status: string; children_count: number; active: boolean; client_id: string; hire_date: string | null; birth_date: string | null; clients?: { name: string } | null }
interface Client { id: string; name: string }

const EMPTY_FORM = { client_id: '', matricule: '', first_name: '', last_name: '', gender: 'M', birth_date: '', hire_date: '', position: '', category: '', marital_status: 'celibataire', children_count: 0, social_security_number: '', phone: '', email: '', active: true }

export default function Employees() {
  const { org } = useAuth()
  const { toasts, toast, dismiss } = useToast()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterClient, setFilterClient] = useState('all')
  const [filterActive, setFilterActive] = useState<'all' | 'true' | 'false'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [deleting, setDeleting] = useState<Employee | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => { if (org) fetchData() }, [org])

  const fetchData = async () => {
    if (!org) return
    const { data: clientData } = await supabase.from('clients').select('id, name').eq('organization_id', org.id).order('name')
    setClients(clientData || [])
    const ids = (clientData || []).map(c => c.id)
    if (!ids.length) { setLoading(false); return }
    const { data } = await supabase.from('employees').select('*, clients(name)').in('client_id', ids).order('last_name')
    setEmployees(data || [])
    setLoading(false)
  }

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY_FORM, client_id: clients[0]?.id || '' }); setShowForm(true) }
  const openEdit = (emp: Employee) => {
    setEditing(emp)
    setForm({ client_id: emp.client_id, matricule: emp.matricule || '', first_name: emp.first_name, last_name: emp.last_name, gender: emp.gender || 'M', birth_date: emp.birth_date || '', hire_date: emp.hire_date || '', position: emp.position || '', category: emp.category || '', marital_status: emp.marital_status, children_count: emp.children_count, social_security_number: '', phone: '', email: '', active: emp.active })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...form, children_count: Number(form.children_count), birth_date: form.birth_date || null, hire_date: form.hire_date || null }
    if (editing) { await supabase.from('employees').update(payload).eq('id', editing.id); toast('Employé mis à jour', 'success') }
    else { await supabase.from('employees').insert(payload); toast('Employé créé', 'success') }
    setShowForm(false); fetchData()
  }

  const handleDelete = async () => {
    if (!deleting) return
    await supabase.from('employees').delete().eq('id', deleting.id)
    setDeleting(null); toast('Employé supprimé', 'info'); fetchData()
  }

  const filtered = employees.filter(e => {
    const q = search.toLowerCase()
    return (
      (`${e.first_name} ${e.last_name}`.toLowerCase().includes(q) || (e.matricule || '').toLowerCase().includes(q) || (e.position || '').toLowerCase().includes(q)) &&
      (filterClient === 'all' || e.client_id === filterClient) &&
      (filterActive === 'all' || String(e.active) === filterActive)
    )
  })

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>

  return (
    <div className="space-y-6 page-enter">
      <ToastContainer toasts={toasts} dismiss={dismiss} />
      <ConfirmModal open={!!deleting} title="Supprimer cet employé" message={`Supprimer "${deleting?.first_name} ${deleting?.last_name}" et ses données de paie ?`} confirmLabel="Supprimer" danger onConfirm={handleDelete} onCancel={() => setDeleting(null)} />

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Employés</h1>
          <p className="text-slate-500 mt-1">{employees.filter(e => e.active).length} actifs · {employees.length} total</p>
        </div>
        <button onClick={openCreate} disabled={!clients.length} className="btn-primary"><Plus className="w-4 h-4" /> Nouvel employé</button>
      </div>

      {!clients.length ? (
        <div className="card p-12 text-center"><Building2 className="w-12 h-12 text-slate-200 mx-auto mb-3" /><p className="text-slate-500">Créez d'abord un client.</p><Link to="/clients" className="btn-primary mt-4 inline-flex">Aller aux clients</Link></div>
      ) : (
        <>
          {/* Filtres */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-10" placeholder="Nom, matricule, poste..." />
            </div>
            <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="input w-auto min-w-[180px]">
              <option value="all">Tous les clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={filterActive} onChange={e => setFilterActive(e.target.value as any)} className="input w-auto">
              <option value="all">Tous statuts</option>
              <option value="true">Actifs</option>
              <option value="false">Inactifs</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="card p-12 text-center"><Users className="w-12 h-12 text-slate-200 mx-auto mb-3" /><p className="text-slate-500">Aucun employé trouvé.</p></div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wide">Employé</th>
                      <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wide">Client</th>
                      <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wide hidden md:table-cell">Poste</th>
                      <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Embauche</th>
                      <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wide">Statut</th>
                      <th className="px-5 py-3.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.map(emp => (
                      <tr key={emp.id} className="table-row">
                        <td className="px-5 py-3.5">
                          <Link to={`/employees/${emp.id}`} className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
                              {emp.first_name[0]}{emp.last_name[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 hover:text-primary-600 transition-colors">{emp.first_name} {emp.last_name}</p>
                              <p className="text-xs text-slate-400">{emp.matricule || '—'}</p>
                            </div>
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-slate-500">{emp.clients?.name || '—'}</td>
                        <td className="px-5 py-3.5 text-sm text-slate-500 hidden md:table-cell">{emp.position || '—'}</td>
                        <td className="px-5 py-3.5 text-sm text-slate-400 hidden lg:table-cell">{emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('fr-FR') : '—'}</td>
                        <td className="px-5 py-3.5">{emp.active ? <span className="badge-success">Actif</span> : <span className="badge-error">Inactif</span>}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => openEdit(emp)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => setDeleting(emp)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
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
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="font-bold text-slate-900">{editing ? "Modifier l'employé" : 'Nouvel employé'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-xl hover:bg-slate-100"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              <div><label className="label">Client *</label>
                <select required value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})} className="input">
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Prénom *</label><input required value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} className="input" /></div>
                <div><label className="label">Nom *</label><input required value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} className="input" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="label">Matricule</label><input value={form.matricule} onChange={e => setForm({...form, matricule: e.target.value})} className="input" /></div>
                <div><label className="label">Sexe</label>
                  <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className="input">
                    <option value="M">Masculin</option><option value="F">Féminin</option>
                  </select>
                </div>
                <div><label className="label">Naissance</label><input type="date" value={form.birth_date} onChange={e => setForm({...form, birth_date: e.target.value})} className="input" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Poste</label><input value={form.position} onChange={e => setForm({...form, position: e.target.value})} className="input" /></div>
                <div><label className="label">Catégorie</label><input value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="input" placeholder="Cadre, Employé..." /></div>
              </div>
              <div><label className="label">Date d'embauche</label><input type="date" value={form.hire_date} onChange={e => setForm({...form, hire_date: e.target.value})} className="input max-w-xs" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Situation matrimoniale</label>
                  <select value={form.marital_status} onChange={e => setForm({...form, marital_status: e.target.value})} className="input">
                    <option value="celibataire">Célibataire</option>
                    <option value="marie">Marié(e)</option>
                    <option value="divorce">Divorcé(e)</option>
                    <option value="veuf">Veuf/Veuve</option>
                  </select>
                </div>
                <div><label className="label">Enfants à charge</label><input type="number" min="0" max="6" value={form.children_count} onChange={e => setForm({...form, children_count: Number(e.target.value)})} className="input" /></div>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="active" checked={form.active} onChange={e => setForm({...form, active: e.target.checked})} className="w-4 h-4 accent-primary-600" />
                <label htmlFor="active" className="text-sm font-medium text-slate-700">Employé actif</label>
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
