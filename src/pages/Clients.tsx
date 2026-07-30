import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { clientsApi, uploadLogo } from '../lib/api'
import { Building2, Plus, Search, Pencil, Trash2, X, MapPin, Phone, Mail, Hash, Upload, Image } from 'lucide-react'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/ui/Toast'

interface Client { id: string; name: string; address: string|null; phone: string|null; email: string|null; ifu: string|null; rccm: string|null; sector: string|null; num_employeur: string|null; nif: string|null; logo_url: string|null; bp: string|null; entite_name: string|null }
const EMPTY_FORM = { name: '', address: '', phone: '', email: '', ifu: '', rccm: '', sector: '', num_employeur: '', nif: '', bp: '', entite_name: '' }

export default function Clients() {
  const { toasts, toast, dismiss } = useToast()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [deleting, setDeleting] = useState<Client | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchClients() }, [])

  const fetchClients = async () => {
    try { setClients(await clientsApi.list()) } catch {} finally { setLoading(false) }
  }

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setLogoFile(null); setLogoPreview(null); setShowForm(true) }
  const openEdit = (c: Client) => {
    setEditing(c)
    setForm({ name: c.name, address: c.address||'', phone: c.phone||'', email: c.email||'', ifu: c.ifu||'', rccm: c.rccm||'', sector: c.sector||'', num_employeur: c.num_employeur||'', nif: c.nif||'', bp: c.bp||'', entite_name: c.entite_name||'' })
    setLogoPreview(c.logo_url||null); setLogoFile(null); setShowForm(true)
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setUploadingLogo(true)
    try {
      let logo_url = editing?.logo_url || null
      if (logoFile) logo_url = await uploadLogo(logoFile)
      if (editing) {
        await clientsApi.update(editing.id, { ...form, logo_url })
        toast('Client mis à jour', 'success')
      } else {
        await clientsApi.create({ ...form, logo_url })
        toast('Client créé', 'success')
      }
      setShowForm(false); fetchClients()
    } catch (err: any) { toast(err.message, 'error') }
    setUploadingLogo(false)
  }

  const handleDelete = async () => {
    if (!deleting) return
    await clientsApi.delete(deleting.id)
    setDeleting(null); toast('Client supprimé', 'info'); fetchClients()
  }

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.sector||'').toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>

  return (
    <div className="space-y-6 page-enter">
      <ToastContainer toasts={toasts} dismiss={dismiss} />
      <ConfirmModal open={!!deleting} title="Supprimer ce client" message={`Supprimer "${deleting?.name}" et toutes ses données ?`} confirmLabel="Supprimer" danger onConfirm={handleDelete} onCancel={() => setDeleting(null)} />
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-black text-slate-900">Clients</h1><p className="text-slate-500 mt-1">{clients.length} entreprise{clients.length !== 1 ? 's' : ''}</p></div>
        <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Nouveau client</button>
      </div>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} className="input pl-10" placeholder="Rechercher..." /></div>
      {filtered.length === 0 ? (
        <div className="card p-12 text-center"><Building2 className="w-12 h-12 text-slate-200 mx-auto mb-3" /><p className="text-slate-500">Aucun client.</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(client => (
            <div key={client.id} className="card p-5 hover:shadow-card-hover transition-all duration-300 group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {client.logo_url ? <img src={client.logo_url} alt="logo" className="w-10 h-10 object-contain rounded-lg border border-slate-100" /> : <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center"><Building2 className="w-5 h-5 text-primary-600" /></div>}
                  <div><h3 className="font-bold text-slate-900 text-sm">{client.name}</h3>{client.sector && <p className="text-xs text-slate-400">{client.sector}</p>}</div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(client)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDeleting(client)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-slate-500">
                {client.address && <div className="flex items-center gap-2"><MapPin className="w-3 h-3 flex-shrink-0" />{client.address}</div>}
                {client.phone && <div className="flex items-center gap-2"><Phone className="w-3 h-3 flex-shrink-0" />{client.phone}</div>}
                {client.email && <div className="flex items-center gap-2"><Mail className="w-3 h-3 flex-shrink-0" />{client.email}</div>}
                {client.num_employeur && <div className="flex items-center gap-2"><Hash className="w-3 h-3 flex-shrink-0" />N° Employeur : {client.num_employeur}</div>}
              </div>
              <Link to={`/clients/${client.id}`} className="mt-3 text-xs text-primary-600 hover:underline block">Voir les employés →</Link>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="font-bold text-slate-900">{editing ? 'Modifier le client' : 'Nouveau client'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-xl hover:bg-slate-100"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="label">Logo de l'entreprise</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 cursor-pointer hover:border-primary-400 transition-colors" onClick={() => logoRef.current?.click()}>
                    {logoPreview ? <img src={logoPreview} alt="logo" className="w-full h-full object-contain p-1" /> : <Image className="w-8 h-8 text-slate-300" />}
                  </div>
                  <div>
                    <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                    <button type="button" onClick={() => logoRef.current?.click()} className="btn-secondary text-sm flex items-center gap-2"><Upload className="w-4 h-4" /> Choisir un logo</button>
                    <p className="text-xs text-slate-400 mt-1">PNG, JPG — 200×200px recommandé</p>
                  </div>
                </div>
              </div>
              <div><label className="label">Nom commercial *</label><input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input" /></div>
              <div><label className="label">Entité / Raison sociale</label><input value={form.entite_name} onChange={e => setForm({...form, entite_name: e.target.value})} className="input" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">N° Employeur CNSS</label><input value={form.num_employeur} onChange={e => setForm({...form, num_employeur: e.target.value})} className="input" /></div>
                <div><label className="label">NIF employeur</label><input value={form.nif} onChange={e => setForm({...form, nif: e.target.value})} className="input" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Adresse / BP</label><input value={form.bp} onChange={e => setForm({...form, bp: e.target.value})} className="input" /></div>
                <div><label className="label">Téléphone</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Email</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input" /></div>
                <div><label className="label">Secteur</label><input value={form.sector} onChange={e => setForm({...form, sector: e.target.value})} className="input" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">IFU</label><input value={form.ifu} onChange={e => setForm({...form, ifu: e.target.value})} className="input" /></div>
                <div><label className="label">RCCM</label><input value={form.rccm} onChange={e => setForm({...form, rccm: e.target.value})} className="input" /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Annuler</button>
                <button type="submit" disabled={uploadingLogo} className="btn-primary flex-1">{uploadingLogo ? 'Enregistrement...' : editing ? 'Mettre à jour' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
