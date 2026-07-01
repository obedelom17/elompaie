import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Building2, Plus, Search, Pencil, Trash2, X } from 'lucide-react'

interface Client { id: string; name: string; address: string | null; phone: string | null; email: string | null; ifu: string | null; rccm: string | null; sector: string | null }

export default function Clients() {
  const { org } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState({ name: '', address: '', phone: '', email: '', ifu: '', rccm: '', sector: '' })

  useEffect(() => { if (org) fetchClients() }, [org])

  const fetchClients = async () => {
    if (!org) return
    const { data } = await supabase.from('clients').select('*').eq('organization_id', org.id).order('name')
    setClients(data || [])
    setLoading(false)
  }

  const openCreate = () => { setEditing(null); setForm({ name: '', address: '', phone: '', email: '', ifu: '', rccm: '', sector: '' }); setShowForm(true) }
  const openEdit = (client: Client) => { setEditing(client); setForm({ name: client.name, address: client.address || '', phone: client.phone || '', email: client.email || '', ifu: client.ifu || '', rccm: client.rccm || '', sector: client.sector || '' }); setShowForm(true) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!org) return
    if (editing) await supabase.from('clients').update(form).eq('id', editing.id)
    else await supabase.from('clients').insert({ ...form, organization_id: org.id })
    setShowForm(false); fetchClients()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce client et tous ses employés et données de paie ?')) return
    await supabase.from('clients').delete().eq('id', id)
    fetchClients()
  }

  const filtered = clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-bold text-slate-900">Clients</h1><p className="text-slate-500 mt-1">Entreprises clientes du cabinet</p></div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Nouveau client</button>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" placeholder="Rechercher un client..." />
      </div>
      {filtered.length === 0 ? (
        <div className="card p-12 text-center"><Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">{search ? 'Aucun client trouvé' : 'Aucun client. Cliquez sur "Nouveau client" pour commencer.'}</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((client) => (
            <div key={client.id} className="card p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <Link to={`/clients/${client.id}`} className="flex-1">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center mb-2"><Building2 className="w-5 h-5 text-primary-600" /></div>
                  <h3 className="font-semibold text-slate-900 hover:text-primary-600">{client.name}</h3>
                </Link>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(client)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(client.id)} className="p-1.5 rounded-lg hover:bg-error-50 text-slate-500 hover:text-error-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="space-y-1 text-sm text-slate-500">
                {client.ifu && <p>IFU: {client.ifu}</p>}
                {client.sector && <p>Secteur: {client.sector}</p>}
                {client.phone && <p>Tél: {client.phone}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">{editing ? 'Modifier le client' : 'Nouveau client'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="label">Nom de l'entreprise *</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="Société XYZ SARL" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">IFU</label><input value={form.ifu} onChange={(e) => setForm({ ...form, ifu: e.target.value })} className="input" /></div>
                <div><label className="label">RCCM</label><input value={form.rccm} onChange={(e) => setForm({ ...form, rccm: e.target.value })} className="input" /></div>
              </div>
              <div><label className="label">Secteur d'activité</label><input value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} className="input" placeholder="Commerce, BTP, Services..." /></div>
              <div><label className="label">Adresse</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Téléphone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" /></div>
                <div><label className="label">Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" /></div>
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
