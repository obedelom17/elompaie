import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { employeesApi, clientsApi } from '../lib/api'
import { Loader2, Plus, Search, Edit2, Trash2, User, X, ChevronRight } from 'lucide-react'

const CONTRACT_TYPES = ['CDI','CDD','Intérim','Stage','Apprentissage']
const STATUTS        = ['actif','suspendu','retraité','décédé']
const SITUATIONS     = ['celibataire','marie','divorce','veuf']
const CATEGORIES     = ['Manœuvre','OS1','OS2','OS3','OP1','OP2','OP3','OHQ','Employé C1','Employé C2','Employé C3','Agent de Maîtrise','Cadre','Cadre Supérieur']

const defaultForm = {
  client_id:'',matricule:'',first_name:'',last_name:'',gender:'M',
  birth_date:'',hire_date:'',position:'',category:'',
  marital_status:'celibataire',children_count:0,
  social_security_number:'',phone:'',email:'',
  active:true,status:'actif',contract_type:'CDI',
  contract_end_date:'',pole:'',responsable:'',
}

const statusColor: Record<string, string> = {
  actif: 'badge-success', suspendu: 'badge-warning',
  retraité: 'badge-info', décédé: 'badge-error',
}

const GField = ({ label, children }: any) => (
  <div><label className="label">{label}</label>{children}</div>
)

export default function Employees() {
  const navigate = useNavigate()
  const [employees, setEmployees] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)
  const [form, setForm] = useState<any>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string|null>(null)
  const [gridSuggestion, setGridSuggestion] = useState<any>(null)

  const load = async () => {
    setLoading(true)
    try { const [emps, cls] = await Promise.all([employeesApi.list(), clientsApi.list()]); setEmployees(emps); setClients(cls) }
    catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (form.client_id && form.category) {
      fetch(`/api/salary-grid-suggestion?client_id=${form.client_id}&category=${encodeURIComponent(form.category)}`, { credentials:'include' })
        .then(r => r.ok ? r.json() : null).then(setGridSuggestion).catch(() => setGridSuggestion(null))
    } else { setGridSuggestion(null) }
  }, [form.client_id, form.category])

  const openCreate = () => { setEditId(null); setForm(defaultForm); setError(''); setGridSuggestion(null); setShowModal(true) }
  const openEdit   = (e: any) => { setEditId(e.id); setForm({...e}); setError(''); setShowModal(true) }
  const sf = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.first_name || !form.last_name) return setError('Prénom et nom requis')
    if (!form.client_id) return setError('Client requis')
    setSaving(true); setError('')
    try {
      if (editId) await employeesApi.update(editId, form)
      else await employeesApi.create(form)
      setShowModal(false); load()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try { await employeesApi.delete(id); setDeleteConfirm(null); load() } catch (e: any) { alert(e.message) }
  }

  const filtered = employees.filter(e => {
    const q = search.toLowerCase()
    return (!q || `${e.first_name} ${e.last_name} ${e.matricule||''}`.toLowerCase().includes(q))
      && (!filterClient || e.client_id === filterClient)
      && (!filterStatus || e.status === filterStatus)
  })

  return (
    <div className="space-y-7 page-enter">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="section-title">Employés</h1>
          <p className="section-sub">{filtered.length} employé{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="btn btn-primary"><Plus className="w-4 h-4" /> Nouvel employé</button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1" style={{ minWidth: 200 }}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input placeholder="Nom, matricule…" value={search} onChange={e => setSearch(e.target.value)} className="input pl-11" />
        </div>
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="input" style={{ width: 'auto' }}>
          <option value="">Tous les clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input" style={{ width: 'auto' }}>
          <option value="">Tous les statuts</option>
          {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(168,85,247,0.3)', borderTopColor: '#a855f7', animation: 'spin 0.8s linear infinite' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="glass p-16 text-center">
          <User className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.1)' }} />
          <p style={{ color: 'rgba(255,255,255,0.35)' }}>Aucun employé trouvé.</p>
        </div>
      ) : (
        <div className="glass overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Employé','Client','Poste','Catégorie','Statut',''].map(h => (
                  <th key={h} className="text-left px-5 py-3" style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} className="table-row cursor-pointer group" onClick={() => navigate(`/employees/${e.id}`)}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(168,85,247,0.18)' }}>
                        <User className="w-4 h-4" style={{ color: '#c4b5fd' }} />
                      </div>
                      <div>
                        <div className="font-semibold text-white text-sm">{e.last_name} {e.first_name}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 1 }}>{e.matricule || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{e.client_name}</td>
                  <td className="px-5 py-4" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{e.position || '—'}</td>
                  <td className="px-5 py-4" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{e.category || '—'}</td>
                  <td className="px-5 py-4"><span className={statusColor[e.status] || 'badge-info'}>{e.status}</span></td>
                  <td className="px-5 py-4" onClick={ev => ev.stopPropagation()}>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(e)} className="btn-icon"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteConfirm(e.id)} className="btn-icon" style={{ color: '#f87171' }}><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal max-w-sm p-7" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-white mb-2" style={{ fontSize: 16 }}>Supprimer cet employé ?</h3>
            <p className="mb-5" style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Action irréversible. Toutes les variables de paie associées seront supprimées.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn btn-secondary flex-1">Annuler</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="btn btn-danger flex-1">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal w-full max-w-2xl" style={{ maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 pb-0">
              <h2 className="font-bold text-white" style={{ fontSize: 18 }}>{editId ? 'Modifier' : 'Nouvel'} employé</h2>
              <button onClick={() => setShowModal(false)} className="btn-icon"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>{error}</div>}

              <GField label="Client *">
                <select className="input" value={form.client_id} onChange={e => sf('client_id', e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </GField>

              <div className="grid grid-cols-2 gap-4">
                <GField label="Prénom *"><input className="input" value={form.first_name} onChange={e => sf('first_name', e.target.value)} /></GField>
                <GField label="Nom *"><input className="input" value={form.last_name} onChange={e => sf('last_name', e.target.value)} /></GField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <GField label="Matricule"><input className="input" value={form.matricule||''} onChange={e => sf('matricule', e.target.value)} /></GField>
                <GField label="Genre">
                  <select className="input" value={form.gender} onChange={e => sf('gender', e.target.value)}>
                    <option value="M">Masculin</option><option value="F">Féminin</option>
                  </select>
                </GField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <GField label="Catégorie">
                  <select className="input" value={form.category||''} onChange={e => sf('category', e.target.value)}>
                    <option value="">— Sélectionner —</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </GField>
                <GField label="Poste/Fonction"><input className="input" value={form.position||''} onChange={e => sf('position', e.target.value)} /></GField>
              </div>

              {gridSuggestion && (
                <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
                  Grille salariale trouvée : <strong>{gridSuggestion.base_salary?.toLocaleString('fr-FR')} FCFA</strong> pour {form.category}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <GField label="Pôle"><input className="input" placeholder="ADMIN, RH…" value={form.pole||''} onChange={e => sf('pole', e.target.value)} /></GField>
                <GField label="Responsable"><input className="input" placeholder="Nom du responsable" value={form.responsable||''} onChange={e => sf('responsable', e.target.value)} /></GField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <GField label="Situation maritale">
                  <select className="input" value={form.marital_status} onChange={e => sf('marital_status', e.target.value)}>
                    {SITUATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </GField>
                <GField label="Enfants à charge"><input type="number" min={0} className="input" value={form.children_count} onChange={e => sf('children_count', parseInt(e.target.value)||0)} /></GField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <GField label="Type de contrat">
                  <select className="input" value={form.contract_type||'CDI'} onChange={e => sf('contract_type', e.target.value)}>
                    {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </GField>
                <GField label="Statut">
                  <select className="input" value={form.status||'actif'} onChange={e => sf('status', e.target.value)}>
                    {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </GField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <GField label="Date d'embauche"><input type="date" className="input" value={form.hire_date||''} onChange={e => sf('hire_date', e.target.value)} /></GField>
                <GField label="Date de naissance"><input type="date" className="input" value={form.birth_date||''} onChange={e => sf('birth_date', e.target.value)} /></GField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <GField label="Téléphone"><input className="input" value={form.phone||''} onChange={e => sf('phone', e.target.value)} /></GField>
                <GField label="Email"><input type="email" className="input" value={form.email||''} onChange={e => sf('email', e.target.value)} /></GField>
              </div>
              <GField label="N° Sécurité Sociale"><input className="input" value={form.social_security_number||''} onChange={e => sf('social_security_number', e.target.value)} /></GField>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">Annuler</button>
                <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editId ? 'Enregistrer' : 'Créer')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
