import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Users, Plus, Search, Pencil, Trash2, X, Building2 } from 'lucide-react'

interface Employee { id: string; matricule: string | null; first_name: string; last_name: string; gender: string | null; position: string | null; category: string | null; marital_status: string; children_count: number; active: boolean; client_id: string; clients?: { name: string } | null }
interface Client { id: string; name: string }

export default function Employees() {
  const { org } = useAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterClient, setFilterClient] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [form, setForm] = useState({ client_id: '', matricule: '', first_name: '', last_name: '', gender: 'M', birth_date: '', hire_date: '', position: '', category: '', marital_status: 'celibataire', children_count: 0, social_security_number: '', phone: '', email: '', active: true })

  useEffect(() => { if (org) fetchData() }, [org])

  const fetchData = async () => {
    if (!org) return
    const { data: clientData } = await supabase.from('clients').select('id, name').eq('organization_id', org.id).order('name')
    setClients(clientData || [])
    const clientIds = (clientData || []).map((c) => c.id)
    if (clientIds.length === 0) { setLoading(false); return }
    const { data: empData } = await supabase.from('employees').select('*, clients(name)').in('client_id', clientIds).order('last_name')
    setEmployees(empData || [])
    setLoading(false)
  }

  const openCreate = () => { setEditing(null); setForm({ client_id: clients[0]?.id || '', matricule: '', first_name: '', last_name: '', gender: 'M', birth_date: '', hire_date: '', position: '', category: '', marital_status: 'celibataire', children_count: 0, social_security_number: '', phone: '', email: '', active: true }); setShowForm(true) }
  const openEdit = (emp: Employee) => { setEditing(emp); setForm({ client_id: emp.client_id, matricule: emp.matricule || '', first_name: emp.first_name, last_name: emp.last_name, gender: emp.gender || 'M', birth_date: '', hire_date: '', position: emp.position || '', category: emp.category || '', marital_status: emp.marital_status, children_count: emp.children_count, social_security_number: '', phone: '', email: '', active: emp.active }); setShowForm(true) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { ...form, children_count: Number(form.children_count), birth_date: form.birth_date || null, hire_date: form.hire_date || null }
    if (editing) await supabase.from('employees').update(payload).eq('id', editing.id)
    else await supabase.from('employees').insert(payload)
    setShowForm(false); fetchData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet employé et ses données de paie ?')) return
    await supabase.from('employees').delete().eq('id', id); fetchData()
  }

  const filtered = employees.filter((e) => {
    const matchSearch = `${e.first_name} ${e.last_name}`.toLowerCase().includes(search.toLowerCase())
    const matchClient = filterClient === 'all' || e.client_id === filterClient
    return matchSearch && matchClient
  })

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-bold text-slate-900">Employés</h1><p className="text-slate-500 mt-1">Salariés des entreprises clientes</p></div>
        <button onClick={openCreate} className="btn-primary" disabled={clients.length === 0}><Plus className="w-4 h-4" /> Nouvel employé</button>
      </div>
      {clients.length === 0 ? (
        <div className="card p-12 text-center"><Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Créez d'abord un client avant d'ajouter des employés.</p><Link to="/clients" className="btn-primary mt-4 inline-flex">Aller aux clients</Link></div>
      ) : (
        <>
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" placeholder="Rechercher un employé..." /></div>
            <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className="input max-w-[200px]"><option value="all">Tous les clients</option>{clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select>
          </div>
          {filtered.length === 0 ? (
            <div className="card p-12 text-center"><Users className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Aucun employé trouvé.</p></div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Employé</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Client</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Poste</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Statut</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <Link to={`/employees/${emp.id}`} className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium text-sm">{emp.first_name[0]}{emp.last_name[0]}</div>
                            <div><p className="font-medium text-slate-900 hover:text-primary-600">{emp.first_name} {emp.last_name}</p><p className="text-xs text-slate-500">{emp.matricule || '—'}</p></div>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{emp.clients?.name || '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{emp.position || '—'}</td>
                        <td className="px-4 py-3">{emp.active ? <span className="badge-success">Actif</span> : <span className="badge-error">Inactif</span>}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => openEdit(emp)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(emp.id)} className="p-1.5 rounded-lg hover:bg-error-50 text-slate-500 hover:text-error-600"><Trash2 className="w-4 h-4" /></button>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-slate-900">{editing ? 'Modifier l\'employé' : 'Nouvel employé'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="label">Client *</label><select required value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className="input">{clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Prénom *</label><input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="input" /></div>
                <div><label className="label">Nom *</label><input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="input" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="label">Matricule</label><input value={form.matricule} onChange={(e) => setForm({ ...form, matricule: e.target.value })} className="input" /></div>
                <div><label className="label">Sexe</label><select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="input"><option value="M">Masculin</option><option value="F">Féminin</option></select></div>
                <div><label className="label">Date de naissance</label><input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} className="input" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Poste</label><input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="input" placeholder="Comptable, Chauffeur..." /></div>
                <div><label className="label">Catégorie</label><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input" placeholder="Cadre, Employé..." /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Situation matrimoniale</label><select value={form.marital_status} onChange={(e) => setForm({ ...form, marital_status: e.target.value })} className="input"><option value="celibataire">Célibataire</option><option value="marie">Marié(e)</option><option value="divorce">Divorcé(e)</option><option value="veuf">Veuf/Veuve</option></select></div>
                <div><label className="label">Enfants à charge</label><input type="number" min="0" value={form.children_count} onChange={(e) => setForm({ ...form, children_count: Number(e.target.value) })} className="input" /></div>
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
