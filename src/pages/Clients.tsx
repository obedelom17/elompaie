import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Building2, Plus, Search, Pencil, Trash2, X, MapPin, Phone, Mail, Hash } from 'lucide-react'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/ui/Toast'

interface Client { id: string; name: string; address: string | null; phone: string | null; email: string | null; ifu: string | null; rccm: string | null; sector: string | null }

export default function Clients() {
  const { org } = useAuth()
  const { toasts, toast, dismiss } = useToast()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [deleting, setDeleting] = useState<Client | null>(null)
  const [form, setForm] = useState({ name: '', address: '', phone: '', email: '', ifu: '', rccm: '', sector: '' })

  useEffect(() => { if (org) fetchClients() }, [org])

  const fetchClients = async () => {
    if (!org) return
    const { data } = await supabase.from('clients').select('*').eq('organization_id', org.id).order('name')
    setClients(data || []); setLoading(false)
  }

  const openCreate = () => { setEditing(null); setForm({ name: '', address: '', phone: '', email: '', ifu: '', rccm: '', sector: '' }); setShowForm(true) }
  const openEdit = (c: Client) => { setEditing(c); setForm({ name: c.name, address: c.address || '', phone: c.phone || '', email: c.email || '', ifu: c.ifu || '', rccm: c.rccm || '', sector: c.sector || '' }); setShowForm(true) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!org) return
    if (editing) { await supabase.from('clients').update(form).eq('id', editing.id); toast('Client mis à jour', 'success') }
    else { await supabase.from('clients').insert({ ...form, organization_id: org.id }); toast('Client créé', 'success') }
    setShowForm(false); fetchClients()
  }

  const handleDelete = async () => {
    if (!deleting) return
    await supabase.from('clients').delete().eq('id', deleting.id)
    setDeleting(null); toast('Client supprimé', 'info'); fetchClients()
  }

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.sector || '').toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>

  return (
    <div className="space-y-6 page-enter">
      <ToastContainer toasts={toasts} dismiss={dismiss} />
      <ConfirmModal open={!!deleting} title="Supprimer ce client" message={`Supprimer "${deleting?.name}" et toutes ses données (employés, paies) ? Action irréversible.`} confirmLabel="Supprimer" danger onConfirm={handleDelete} onCancel={() => setDeleting(null)} />

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Clients</h1>
          <p className="text-slate-500 mt-1">{clients.length} entreprise{clients.length !== 1 ? 's' : ''} clientes</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Nouveau client</button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-10" placeholder="Rechercher un client..." />
      </div>

      {filtered.length === 0 ? (
        <div className="card p-14 text-center">
          <Building2 className="w-14 h-14 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500">{search ? 'Aucun résultat.' : 'Aucun client. Commencez par en créer un.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((client, i) => (
            <div key={client.id} className={`card group hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 overflow-hidden stagger-${Math.min(i + 1, 4)}`}>
              {/* Color band */}
              <div className="h-1.5 bg-gradient-to-r from-primary-400 to-accent-500" />
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <Link to={`/clients/${client.id}`} className="flex items-center gap-3 flex-1">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <Building2 className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 hover:text-primary-600 transition-colors truncate">{client.name}</h3>
                      {client.sector && <p className="text-xs text-slate-400 mt-0.5">{client.sector}</p>}
                    </div>
                  </Link>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(client)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleting(client)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {client.ifu && <div className="flex items-center gap-2 text-xs text-slate-500"><Hash className="w-3 h-3 flex-shrink-0" /><span>IFU: {client.ifu}</span></div>}
                  {client.phone && <div className="flex items-center gap-2 text-xs text-slate-500"><Phone className="w-3 h-3 flex-shrink-0" /><span>{client.phone}</span></div>}
                  {client.email && <div className="flex items-center gap-2 text-xs text-slate-500"><Mail className="w-3 h-3 flex-shrink-0" /><span className="truncate">{client.email}</span></div>}
                  {client.address && <div className="flex items-center gap-2 text-xs text-slate-500"><MapPin className="w-3 h-3 flex-shrink-0" /><span className="truncate">{client.address}</span></div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">{editing ? 'Modifier le client' : 'Nouveau client'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-xl hover:bg-slate-100"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div><label className="label">Nom de l'entreprise *</label><input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input" placeholder="Société XYZ SARL" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">IFU</label><input value={form.ifu} onChange={e => setForm({...form, ifu: e.target.value})} className="input" /></div>
                <div><label className="label">RCCM</label><input value={form.rccm} onChange={e => setForm({...form, rccm: e.target.value})} className="input" /></div>
              </div>
              <div><label className="label">Secteur d'activité</label><input value={form.sector} onChange={e => setForm({...form, sector: e.target.value})} className="input" placeholder="Commerce, BTP, Services..." /></div>
              <div><label className="label">Adresse</label><input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="input" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Téléphone</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input" /></div>
                <div><label className="label">Email</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input" /></div>
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
