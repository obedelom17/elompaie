import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { clientsApi, uploadLogo } from '../lib/api'
import { Building2, Plus, Search, Pencil, Trash2, X, MapPin, Phone, Mail, Hash, Upload, Loader2 } from 'lucide-react'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/ui/Toast'

interface Client { id: string; name: string; address: string|null; phone: string|null; email: string|null; ifu: string|null; rccm: string|null; sector: string|null; num_employeur: string|null; nif: string|null; logo_url: string|null; bp: string|null; entite_name: string|null }
const EMPTY_FORM = { name: '', address: '', phone: '', email: '', ifu: '', rccm: '', sector: '', num_employeur: '', nif: '', bp: '', entite_name: '' }

const GlassInput = ({ label, icon: Icon, ...props }: any) => (
  <div>
    <label className="label">{label}</label>
    <div className="relative">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.28)' }} />}
      <input className="input" style={{ paddingLeft: Icon ? 42 : 16 }} {...props} />
    </div>
  </div>
)

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
  const [saving, setSaving] = useState(false)
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
    e.preventDefault(); setSaving(true)
    try {
      let logo_url = editing?.logo_url || null
      if (logoFile) logo_url = await uploadLogo(logoFile)
      if (editing) { await clientsApi.update(editing.id, { ...form, logo_url }); toast('Client mis à jour', 'success') }
      else { await clientsApi.create({ ...form, logo_url }); toast('Client créé', 'success') }
      setShowForm(false); fetchClients()
    } catch (err: any) { toast(err.message, 'error') }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!deleting) return
    await clientsApi.delete(deleting.id)
    setDeleting(null); toast('Client supprimé', 'info'); fetchClients()
  }

  const f = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))
  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.sector||'').toLowerCase().includes(search.toLowerCase()))

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(168,85,247,0.3)', borderTopColor: '#a855f7', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div className="space-y-7 page-enter">
      <ToastContainer toasts={toasts} dismiss={dismiss} />
      <ConfirmModal open={!!deleting} title="Supprimer ce client" message={`Supprimer "${deleting?.name}" et toutes ses données ?`} confirmLabel="Supprimer" danger onConfirm={handleDelete} onCancel={() => setDeleting(null)} />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="section-title">Clients</h1>
          <p className="section-sub">{clients.length} entreprise{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Nouveau client
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-11" placeholder="Rechercher un client..." />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="glass p-16 text-center">
          <Building2 className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 15 }}>Aucun client trouvé.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(client => (
            <div key={client.id} className="glass glass-hover group p-6">
              <div className="flex items-start justify-between mb-4">
                <Link to={`/clients/${client.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  {client.logo_url
                    ? <img src={client.logo_url} alt="logo" className="w-11 h-11 object-contain rounded-xl flex-shrink-0" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }} />
                    : <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.3))' }}>
                        <Building2 className="w-5 h-5" style={{ color: '#c4b5fd' }} />
                      </div>
                  }
                  <div className="min-w-0">
                    <h3 className="font-bold text-white text-sm truncate">{client.name}</h3>
                    {client.sector && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 1 }}>{client.sector}</p>}
                  </div>
                </Link>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button onClick={() => openEdit(client)} className="btn-icon"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDeleting(client)} className="btn-icon" style={{ color: '#f87171' }}><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="space-y-1.5" style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)' }}>
                {client.address && <div className="flex items-center gap-2"><MapPin className="w-3 h-3 flex-shrink-0" /><span className="truncate">{client.address}</span></div>}
                {client.phone   && <div className="flex items-center gap-2"><Phone className="w-3 h-3 flex-shrink-0" />{client.phone}</div>}
                {client.email   && <div className="flex items-center gap-2"><Mail className="w-3 h-3 flex-shrink-0" /><span className="truncate">{client.email}</span></div>}
                {client.nif     && <div className="flex items-center gap-2"><Hash className="w-3 h-3 flex-shrink-0" />NIF: {client.nif}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 pb-0">
              <h2 className="text-lg font-bold text-white">{editing ? 'Modifier le client' : 'Nouveau client'}</h2>
              <button onClick={() => setShowForm(false)} className="btn-icon"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">

              {/* Logo upload */}
              <div className="flex items-center gap-4 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)' }}>
                {logoPreview
                  ? <img src={logoPreview} alt="logo" className="w-16 h-16 object-contain rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
                  : <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <Upload className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.3)' }} />
                    </div>
                }
                <div>
                  <p className="text-white text-sm font-medium mb-1">Logo de l'entreprise</p>
                  <button type="button" onClick={() => logoRef.current?.click()} className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}>
                    Choisir une image
                  </button>
                  <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <GlassInput label="Nom du client *" icon={Building2} value={form.name} onChange={(e: any) => f('name', e.target.value)} required placeholder="Pharmacol Togo" />
                </div>
                <GlassInput label="Entité / Filiale" value={form.entite_name} onChange={(e: any) => f('entite_name', e.target.value)} placeholder="Filiale" />
                <GlassInput label="Secteur d'activité" value={form.sector} onChange={(e: any) => f('sector', e.target.value)} placeholder="Pharmacie" />
                <GlassInput label="N° Employeur" icon={Hash} value={form.num_employeur} onChange={(e: any) => f('num_employeur', e.target.value)} placeholder="00-0000-0000" />
                <GlassInput label="NIF" icon={Hash} value={form.nif} onChange={(e: any) => f('nif', e.target.value)} placeholder="123456789" />
                <GlassInput label="IFU" icon={Hash} value={form.ifu} onChange={(e: any) => f('ifu', e.target.value)} placeholder="IFU..." />
                <GlassInput label="RCCM" icon={Hash} value={form.rccm} onChange={(e: any) => f('rccm', e.target.value)} placeholder="RCCM..." />
                <GlassInput label="Téléphone" icon={Phone} value={form.phone} onChange={(e: any) => f('phone', e.target.value)} placeholder="+228 00 00 00 00" />
                <GlassInput label="Email" icon={Mail} type="email" value={form.email} onChange={(e: any) => f('email', e.target.value)} placeholder="contact@entreprise.tg" />
                <GlassInput label="Boîte postale" value={form.bp} onChange={(e: any) => f('bp', e.target.value)} placeholder="BP 1234" />
                <div className="col-span-2">
                  <GlassInput label="Adresse" icon={MapPin} value={form.address} onChange={(e: any) => f('address', e.target.value)} placeholder="Lomé, Togo" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary flex-1">Annuler</button>
                <button type="submit" disabled={saving} className="btn btn-primary flex-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editing ? 'Enregistrer' : 'Créer le client')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
