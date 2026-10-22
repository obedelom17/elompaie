import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { employeesApi, clientsApi } from '../lib/api'
import { Loader2, Plus, Search, Edit2, Trash2, User, X } from 'lucide-react'
import { t, locale } from '../lib/i18n'

const CONTRACT_TYPES = ['CDI','CDD','Intérim','Stage','Apprentissage']
const STATUTS = ['actif','suspendu','retraité','décédé']
const SITUATIONS = ['celibataire','marie','divorce','veuf']
const SITUATION_LABELS: Record<string,string> = { celibataire: 'Célibataire', marie: 'Marié(e)', divorce: 'Divorcé(e)', veuf: 'Veuf/Veuve' }
const CATEGORIES = ['Manœuvre','OS1','OS2','OS3','OP1','OP2','OP3','OHQ','Employé C1','Employé C2','Employé C3','Agent de Maîtrise','Cadre','Cadre Supérieur']

const defaultForm = {
  client_id:'',matricule:'',first_name:'',last_name:'',gender:'M',
  birth_date:'',hire_date:'',position:'',category:'',
  marital_status:'celibataire',children_count:0,
  social_security_number:'',phone:'',email:'',
  active:true,status:'actif',contract_type:'CDI',
  contract_end_date:'',pole:'',responsable:'',
}

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
    try {
      const [emps, cls] = await Promise.all([employeesApi.list(), clientsApi.list()])
      setEmployees(emps); setClients(cls)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // Salary grid suggestion when category changes
  useEffect(() => {
    if (form.client_id && form.category) {
      fetch(`/api/salary-grid-suggestion?client_id=${form.client_id}&category=${encodeURIComponent(form.category)}`, { credentials:'include' })
        .then(r => r.ok ? r.json() : null)
        .then(data => setGridSuggestion(data))
        .catch(() => setGridSuggestion(null))
    } else {
      setGridSuggestion(null)
    }
  }, [form.client_id, form.category])

  const openCreate = () => { setEditId(null); setForm(defaultForm); setError(''); setGridSuggestion(null); setShowModal(true) }
  const openEdit   = (e: any) => { setEditId(e.id); setForm({...e}); setError(''); setShowModal(true) }

  const handleSave = async () => {
    if (!form.first_name || !form.last_name) return setError(t("Prénom et nom requis"))
    if (!form.client_id) return setError('Client requis')
    setSaving(true); setError('')
    try {
      if (editId) await employeesApi.update(editId, form)
      else await employeesApi.create(form)
      setShowModal(false); load()
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      await employeesApi.delete(id)
      setDeleteConfirm(null); load()
    } catch (e: any) { alert(e.message) }
  }

  const filtered = employees.filter(e => {
    const q = search.toLowerCase()
    const matchSearch = !q || `${e.first_name} ${e.last_name} ${e.matricule||''}`.toLowerCase().includes(q)
    const matchClient = !filterClient || e.client_id === filterClient
    const matchStatus = !filterStatus || e.status === filterStatus
    return matchSearch && matchClient && matchStatus
  })

  const inputCls = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
  const labelCls = "block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{t("Employés")}</h1>
          <p className="text-sm text-slate-500">{filtered.length} {t("employé(s)")}</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> {t("Nouvel employé")}
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input placeholder={t("Rechercher nom, matricule…")} value={search} onChange={e=>setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
        </div>
        <select value={filterClient} onChange={e=>setFilterClient(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white">
          <option value="">{t("Tous les clients")}</option>
          {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white">
          <option value="">{t("Tous les statuts")}</option>
          {STATUTS.map(s=><option key={s} value={s}>{t(s)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t("Aucun employé trouvé")}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                {['Employé','Client','Poste','Catégorie','Statut',''].map((h,i)=>(
                  <th key={i} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{h && t(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.map(e=>(
                <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer" onClick={()=>navigate(`/employees/${e.id}`)}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800 dark:text-white">{e.last_name} {e.first_name}</div>
                    <div className="text-xs text-slate-400">{e.matricule||'—'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{e.client_name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{e.position||'—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{e.category||'—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.status==='actif'?'bg-emerald-100 text-emerald-700':e.status==='suspendu'?'bg-yellow-100 text-yellow-700':'bg-slate-100 text-slate-600'}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={ev=>ev.stopPropagation()}>
                    <div className="flex gap-1">
                      <button onClick={()=>openEdit(e)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded"><Edit2 className="w-3.5 h-3.5"/></button>
                      <button onClick={()=>setDeleteConfirm(e.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5"/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="font-bold text-slate-800 dark:text-white mb-2">{t("Supprimer cet employé ?")}</h3>
            <p className="text-sm text-slate-500 mb-4">{t("Cette action est irréversible. Toutes les variables de paie associées seront supprimées.")}</p>
            <div className="flex gap-3">
              <button onClick={()=>setDeleteConfirm(null)} className="flex-1 btn-secondary">{t("Annuler")}</button>
              <button onClick={()=>handleDelete(deleteConfirm)} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-md transition">{t("Supprimer")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Création/Édition */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-8 px-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-2xl w-full shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">{editId ? `${t("Modifier")} ${t("employé")}` : t("Nouvel employé")}</h2>
              <button onClick={()=>setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>

            {error && <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}

            <div className="space-y-4">
              {/* Client */}
              <div>
                <label className={labelCls}>{t("Client *")}</label>
                <select className={inputCls} value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})}>
                  <option value="">{t("— Sélectionner —")}</option>
                  {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className={labelCls}>{t("Prénom *")}</label><input className={inputCls} value={form.first_name} onChange={e=>setForm({...form,first_name:e.target.value})} /></div>
                <div><label className={labelCls}>{t("Nom *")}</label><input className={inputCls} value={form.last_name} onChange={e=>setForm({...form,last_name:e.target.value})} /></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className={labelCls}>{t("Matricule")}</label><input className={inputCls} value={form.matricule||''} onChange={e=>setForm({...form,matricule:e.target.value})} /></div>
                <div>
                  <label className={labelCls}>{t("Genre")}</label>
                  <select className={inputCls} value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}>
                    <option value="M">{t("Masculin")}</option><option value="F">{t("Féminin")}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{t("Catégorie")}</label>
                  <select className={inputCls} value={form.category||''} onChange={e=>setForm({...form,category:e.target.value})}>
                    <option value="">{t("— Sélectionner —")}</option>
                    {CATEGORIES.map(c=><option key={c} value={c}>{t(c)}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>{t("Poste/Fonction")}</label><input className={inputCls} value={form.position||''} onChange={e=>setForm({...form,position:e.target.value})} /></div>
              </div>

              {/* Grid suggestion */}
              {gridSuggestion && (
                <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-3 text-sm text-primary-700 dark:text-primary-300">
                  {t("Grille salariale trouvée :")} <strong>{gridSuggestion.base_salary?.toLocaleString(locale())} {t("FCFA")}</strong> {t("pour")} {form.category}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className={labelCls}>{t("Pôle")}</label><input className={inputCls} placeholder={t("Ex: ADMIN, RH…")} value={form.pole||''} onChange={e=>setForm({...form,pole:e.target.value})} /></div>
                <div><label className={labelCls}>{t("Responsable")}</label><input className={inputCls} placeholder={t("Nom du responsable")} value={form.responsable||''} onChange={e=>setForm({...form,responsable:e.target.value})} /></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{t("Situation maritale")}</label>
                  <select className={inputCls} value={form.marital_status} onChange={e=>setForm({...form,marital_status:e.target.value})}>
                    {SITUATIONS.map(s=><option key={s} value={s}>{t(SITUATION_LABELS[s])}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>{t("Enfants à charge")}</label><input type="number" min={0} className={inputCls} value={form.children_count === 0 ? '' : form.children_count} placeholder="0" onChange={e=>setForm({...form,children_count:parseInt(e.target.value)||0})} /></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{t("Type de contrat")}</label>
                  <select className={inputCls} value={form.contract_type||'CDI'} onChange={e=>setForm({...form,contract_type:e.target.value})}>
                    {CONTRACT_TYPES.map(ct=><option key={ct} value={ct}>{t(ct)}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{t("Statut")}</label>
                  <select className={inputCls} value={form.status||'actif'} onChange={e=>setForm({...form,status:e.target.value})}>
                    {STATUTS.map(s=><option key={s} value={s}>{t(s)}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className={labelCls}>{t("Date d'embauche")}</label><input type="date" className={inputCls} value={form.hire_date||''} onChange={e=>setForm({...form,hire_date:e.target.value})} /></div>
                <div><label className={labelCls}>{t("Date de naissance")}</label><input type="date" className={inputCls} value={form.birth_date||''} onChange={e=>setForm({...form,birth_date:e.target.value})} /></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className={labelCls}>{t("Téléphone")}</label><input className={inputCls} value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})} /></div>
                <div><label className={labelCls}>{t("Email")}</label><input type="email" className={inputCls} value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})} /></div>
              </div>

              <div><label className={labelCls}>{t("N° Sécurité Sociale")}</label><input className={inputCls} value={form.social_security_number||''} onChange={e=>setForm({...form,social_security_number:e.target.value})} /></div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={()=>setShowModal(false)} className="flex-1 btn-secondary">{t("Annuler")}</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary flex items-center justify-center gap-2">
                {saving&&<Loader2 className="w-4 h-4 animate-spin"/>}
                {editId?t("Mettre à jour"):t("Créer")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
