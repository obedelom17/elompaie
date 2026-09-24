import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'
import { calculatePayroll } from '../lib/payroll'
import { generateBulletinPDF, pdfToImagePng } from '../lib/pdf'
import { FileSpreadsheet, FileText, Image, Loader2, ChevronDown } from 'lucide-react'

interface Client   { id: string; name: string }
interface Period   { id: string; period_month: number; period_year: number; status: string; client_name: string; client_id: string }
interface Employee { id: string; first_name: string; last_name: string; hire_date: string; position: string; category?: string; phone?: string; social_security_number?: string; nif?: string; children_count?: number; marital_status?: string }

const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
type Tab    = 'bulletin' | 'etat' | 'solde'
type Format = 'xlsx' | 'pdf' | 'png'

// ─── FormatPicker ──────────────────────────────────────────────────────────────
function FormatPicker({
  value, onChange, disabled,
}: { value: Format; onChange: (f: Format) => void; disabled?: boolean }) {
  const opts: { key: Format; label: string; icon: any; color: string }[] = [
    { key: 'xlsx', label: 'Excel .xlsx', icon: FileSpreadsheet, color: 'bg-green-100 text-green-700 border-green-300' },
    { key: 'pdf',  label: 'PDF',         icon: FileText,        color: 'bg-red-100 text-red-700 border-red-300'       },
    { key: 'png',  label: 'Image PNG',   icon: Image,           color: 'bg-purple-100 text-purple-700 border-purple-300' },
  ]
  return (
    <div className="flex gap-2">
      {opts.map(o => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          disabled={disabled}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all
            ${value === o.key ? o.color + ' ring-2 ring-offset-1 ring-current' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'}
            ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <o.icon className="w-4 h-4" />
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ─── DownloadButton ────────────────────────────────────────────────────────────
function DownloadButton({ onClick, loading, format }: { onClick: () => void; loading: boolean; format: Format }) {
  const colors = { xlsx: 'bg-green-600 hover:bg-green-700', pdf: 'bg-red-500 hover:bg-red-600', png: 'bg-purple-600 hover:bg-purple-700' }
  const labels = { xlsx: 'Télécharger .xlsx', pdf: 'Télécharger PDF', png: 'Télécharger PNG' }
  return (
    <button onClick={onClick} disabled={loading}
      className={`w-full ${colors[format]} disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition flex items-center justify-center gap-2`}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
      {loading ? 'Génération en cours…' : labels[format]}
    </button>
  )
}

// ─── Page principale ───────────────────────────────────────────────────────────
export default function ExportReports() {
  const [clients,   setClients]   = useState<Client[]>([])
  const [periods,   setPeriods]   = useState<Period[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [bulletinEmployees, setBulletinEmployees] = useState<Employee[]>([])
  const [loading,   setLoading]   = useState(false)
  const [tab,       setTab]       = useState<Tab>('bulletin')
  const [msg,       setMsg]       = useState<{type:'success'|'error';text:string}|null>(null)

  // Bulletin
  const [bPeriod,   setBPeriod]   = useState('')
  const [bEmployee, setBEmployee] = useState('')
  const [bAll,      setBAll]      = useState(false)
  const [bFormat,   setBFormat]   = useState<Format>('pdf')

  // État des charges
  const [ePeriod,   setEPeriod]   = useState('')
  const [eRegul,    setERegul]    = useState(false)
  const [eFormat,   setEFormat]   = useState<Format>('xlsx')

  // Solde
  const [sEmployee,        setSEmployee]        = useState('')
  const [sClient,          setSClient]          = useState('')
  const [sPeriod,          setSPeriod]          = useState('')
  const [sDateDepart,      setSDateDepart]      = useState('')
  const [sDateFin,         setSDateFin]         = useState('')
  const [sAvance,          setSAvance]          = useState('0')
  const [sPreavis,         setSPreavis]         = useState('0')
  const [sInclurePreavis,  setSInclurePreavis]  = useState(false)
  const [sRetenuesArr,     setSRetenuesArr]     = useState('0')
  const [sRetenueSurSolde, setSRetenueSurSolde] = useState('0')
  const [sRegulIrpp,       setSRegulIrpp]       = useState('0')
  const [sJoursConges,     setSJoursConges]     = useState<{nb:string;label:string}[]>([{nb:'',label:''}])
  const [sTauxAuto,        setSTauxAuto]        = useState(true)
  const [sTauxManuel,      setSTauxManuel]      = useState('0')
  const [sFormat,          setSFormat]          = useState<Format>('xlsx')

  useEffect(() => {
    apiFetch('/api/clients').then(setClients).catch(() => {})
    apiFetch('/api/payroll').then(setPeriods).catch(() => {})
  }, [])
  useEffect(() => {
    if (sClient) apiFetch(`/api/employees?client_id=${sClient}`).then(setEmployees).catch(() => {})
  }, [sClient])
  useEffect(() => {
    if (!bPeriod) { setBulletinEmployees([]); return }
    const p = periods.find(p => p.id === bPeriod)
    if (p?.client_id) apiFetch(`/api/employees?client_id=${p.client_id}`).then(setBulletinEmployees).catch(() => {})
  }, [bPeriod, periods])

  const getPeriodLabel = (id: string) => {
    const p = periods.find(p => p.id === id)
    return p ? `${MOIS[p.period_month - 1]} ${p.period_year}` : ''
  }

  // ─── Télécharger xlsx (état, solde) ────────────────────────────────────────
  const downloadXlsx = async (url: string, body: object, filename: string) => {
    setLoading(true); setMsg(null)
    try {
      const res = await fetch(url, { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
      if (!res.ok) { const e = await res.json().catch(() => ({ error:'Erreur' })); throw new Error(e.error) }
      const blob = await res.blob()
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click()
      setMsg({ type:'success', text:'Fichier téléchargé' })
    } catch (e: any) { setMsg({ type:'error', text: e.message }) }
    finally { setLoading(false) }
  }

  // ─── Générer bulletin (pdf/png/xlsx) ───────────────────────────────────────
  const generateBulletin = async (empId: string, periodId: string, format: Format) => {
    const [varsData, periodData] = await Promise.all([
      fetch(`/api/payroll-variables?period_id=${periodId}&employee_id=${empId}`, { credentials:'include' }).then(r => r.json()),
      fetch(`/api/payroll?id=${periodId}`, { credentials:'include' }).then(r => r.json()),
    ])
    const vars = Array.isArray(varsData) ? varsData[0] : varsData
    if (!vars) throw new Error('Aucune variable de paie trouvée')

    const emp   = bulletinEmployees.find(e => e.id === empId) || {} as any
    // Mapper tous les champs DB (snake_case) vers PayrollInput
    const anciennete = vars.anciennete || vars.indemnite_anciennete || 0
    const input = {
      base_salary:               Number(vars.base_salary)                                   || 0,
      // overtime_premium inclut le sursalaire ET l'ancienneté (non dans PayrollInput)
      overtime_premium:          (Number(vars.overtime_premium || vars.sursalaire)          || 0)
                                 + anciennete,
      function_allowance:        Number(vars.function_allowance  || vars.indemnite_fonction) || 0,
      communication_allowance:   Number(vars.communication_allowance || vars.indemnite_communication) || 0,
      housing_premium:           Number(vars.housing_premium    || vars.indemnite_logement)  || 0,
      meal_premium:              Number(vars.meal_premium       || vars.indemnite_repas)      || 0,
      transport_allowance:       Number(vars.transport_allowance|| vars.indemnite_transport)  || 0,
      salary_advance:            Number(vars.salary_advance     || vars.avance_salaire)       || 0,
      loan_payment:              Number(vars.loan_payment       || vars.remboursement_pret)   || 0,
      flat_deduction:            Number(vars.flat_deduction     || vars.deduction_forfaitaire)|| 0,
      marital_status:            emp.marital_status  || vars.marital_status  || 'celibataire',
      children_count:            Number(emp.children_count ?? vars.children_count)            || 0,
      indemnite_grossesse:       Number(vars.indemnite_grossesse) || 0,
    }
    // Stocker anciennete séparément pour l'affichage dans le bulletin
    const ancienneteVal = anciennete
    const result  = calculatePayroll(input)
    const lbl     = getPeriodLabel(periodId)
    const empName = (emp as any).last_name || 'employe'

    if (format === 'xlsx') {
      // Fallback Excel via API
      await downloadXlsx('/api/export-bulletin', { period_id: periodId, employee_id: empId }, `Bulletin_${empName}_${lbl}.xlsx`)
      return
    }

    // periodData contient directement period_month, period_year, client_name, logo_url, etc.
    const doc = await generateBulletinPDF({
      employee: {
        ...emp,
        last_name:               emp.last_name || vars.last_name || '',
        first_name:              emp.first_name || vars.first_name || '',
        social_security_number:  emp.social_security_number || vars.social_security_number || '',
        position:                emp.position || vars.position || '',
        category:                emp.category || vars.category || '',
        phone:                   emp.phone || vars.phone || '',
        hire_date:               emp.hire_date || vars.hire_date || '',
        children_count:          emp.children_count ?? vars.children_count ?? 0,
        marital_status:          emp.marital_status || vars.marital_status || 'celibataire',
        nif:                     emp.nif || vars.nif_employe || '',
      },
      period: {
        period_month:  periodData.period_month,
        period_year:   periodData.period_year,
        clients: {
          name:         periodData.client_name  || '',
          logo_url:     periodData.logo_url     || null,
          num_employeur:periodData.num_employeur|| '',
          nif:          periodData.nif          || '',
          entite_name:  periodData.entite_name  || '',
          bp:           periodData.bp           || '',
          phone:        periodData.client_phone || '',
          address:      periodData.address      || '',
        },
      },
      variables: { ...input, anciennete: ancienneteVal },
      result,
      orgName:  periodData.client_name || '',
      returnDoc: true,
    })

    if (format === 'pdf') {
      doc.save(`Bulletin_${empName}_${lbl}.pdf`)
    } else {
      await pdfToImagePng(doc, `Bulletin_${empName}_${lbl}.png`)
    }
  }

  // ─── Générer état des charges en pdf/png ───────────────────────────────────
  const downloadEtat = async (format: Format) => {
    if (!ePeriod) return setMsg({ type:'error', text:'Sélectionne une période' })
    const lbl = getPeriodLabel(ePeriod)
    const suffix = eRegul ? '_regul' : ''

    if (format === 'xlsx') {
      return downloadXlsx('/api/export-etat-charges',
        { period_id: ePeriod, avec_regularisation: eRegul },
        `Etat_Charges_${lbl}${suffix}.xlsx`)
    }

    // PDF/PNG via xlsx converti: on génère le xlsx, on l'affiche via html2canvas approx
    // Alternative: générer un PDF tabulaire avec autoTable
    setLoading(true); setMsg(null)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const res = await fetch('/api/export-etat-charges', {
        method:'POST', credentials:'include',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ period_id: ePeriod, avec_regularisation: eRegul, json: true }),
      })
      if (!res.ok) throw new Error('Erreur serveur')
      const { rows, title } = await res.json()

      const doc = new jsPDF({ orientation:'landscape', unit:'mm', format:'a3' })
      doc.setFontSize(13); doc.setFont('helvetica','bold')
      doc.text(title, doc.internal.pageSize.getWidth() / 2, 14, { align:'center' })

      const headers = eRegul
        ? ['N°','Nom et Prénoms','Responsable','Poste','Pole','Brut','Brut imposable','CNSS Sal 4%','AMU Sal 5%','CNSS Pat 17,5%','AMU Pat 5%','IRPP','Régul IRPP','IRPP à payer','Total Ret.','Net à payer']
        : ['N°','Nom et Prénoms','Responsable','Poste','Pole','Brut','Brut imposable','CNSS Sal 4%','AMU Sal 5%','CNSS Pat 17,5%','AMU Pat 5%','IRPP','Total Ret.','Net à payer']

      autoTable(doc, {
        startY: 20,
        head: [headers],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [217,225,242], textColor:[0,0,0], fontSize:7, fontStyle:'bold', halign:'center' },
        bodyStyles: { fontSize:7 },
        columnStyles: { 0:{halign:'center',cellWidth:8}, 1:{cellWidth:40} },
        foot: [rows.length > 0 ? ['','TOTAL','','','', ...Array(headers.length-5).fill('')] : []],
        showFoot: 'lastPage',
      })
      doc.setFontSize(7); doc.setFont('helvetica','italic')
      doc.text(`Édité le ${new Date().toLocaleDateString('fr-FR')} · ElomPaie · CGI OTR 2025`,
        doc.internal.pageSize.getWidth()/2, doc.internal.pageSize.getHeight()-5, { align:'center' })

      if (format === 'pdf') {
        doc.save(`Etat_Charges_${lbl}${suffix}.pdf`)
      } else {
        await pdfToImagePng(doc, `Etat_Charges_${lbl}${suffix}.png`, 1.5)
      }
      setMsg({ type:'success', text:'Document généré' })
    } catch (e: any) { setMsg({ type:'error', text: e.message }) }
    finally { setLoading(false) }
  }

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  const labelCls = "block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide"
  const tabs: { key: Tab; label: string }[] = [
    { key:'bulletin', label:'Bulletin de paie'    },
    { key:'etat',     label:'État des charges'     },
    { key:'solde',    label:'Solde de tout compte' },
  ]

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Exports & Rapports</h1>
      <p className="text-sm text-gray-500 mb-6">Générez vos documents en Excel, PDF ou Image PNG</p>

      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${msg.type==='success'?'bg-green-50 text-green-700 border border-green-200':'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.text}
        </div>
      )}

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setMsg(null) }}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${tab===t.key?'bg-white text-blue-600 shadow':'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Bulletin ── */}
      {tab==='bulletin' && (
        <div className="bg-white rounded-2xl shadow p-6 space-y-5">
          <div>
            <h2 className="font-semibold text-gray-800">Bulletin de paie</h2>
            <p className="text-xs text-gray-500 mt-0.5">Format DVV — identique à votre référence</p>
          </div>

          <div>
            <label className={labelCls}>Format de sortie</label>
            <FormatPicker value={bFormat} onChange={setBFormat} />
          </div>

          <div>
            <label className={labelCls}>Période de paie</label>
            <select className={inputCls} value={bPeriod} onChange={e=>{setBPeriod(e.target.value);setBEmployee('');setBAll(false)}}>
              <option value="">— Sélectionner —</option>
              {periods.map(p=><option key={p.id} value={p.id}>{p.client_name} — {MOIS[p.period_month-1]} {p.period_year}</option>)}
            </select>
          </div>

          {bPeriod && (
            <>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={bAll} onChange={e=>setBAll(e.target.checked)} className="h-4 w-4 rounded" />
                Tous les bulletins de la période
              </label>
              {!bAll && (
                <div>
                  <label className={labelCls}>Employé</label>
                  <select className={inputCls} value={bEmployee} onChange={e=>setBEmployee(e.target.value)}>
                    <option value="">— Sélectionner —</option>
                    {bulletinEmployees.map(e=><option key={e.id} value={e.id}>{e.last_name} {e.first_name}</option>)}
                  </select>
                </div>
              )}
            </>
          )}

          <DownloadButton format={bFormat} loading={loading} onClick={async () => {
            if (!bPeriod) return setMsg({type:'error',text:'Sélectionne une période'})
            setLoading(true); setMsg(null)
            try {
              if (bAll) {
                let ok=0, fail=0
                for (const emp of bulletinEmployees) {
                  try { await generateBulletin(emp.id, bPeriod, bFormat); ok++ }
                  catch { fail++ }
                }
                setMsg({ type:'success', text:`${ok} bulletin(s) générés${fail>0?` (${fail} erreur(s))`:''}`})
              } else {
                if (!bEmployee) { setMsg({type:'error',text:'Sélectionne un employé'}); setLoading(false); return }
                await generateBulletin(bEmployee, bPeriod, bFormat)
                setMsg({ type:'success', text:'Bulletin généré' })
              }
            } catch (e:any) { setMsg({type:'error',text:e.message}) }
            finally { setLoading(false) }
          }} />
        </div>
      )}

      {/* ── État des charges ── */}
      {tab==='etat' && (
        <div className="bg-white rounded-2xl shadow p-6 space-y-5">
          <div>
            <h2 className="font-semibold text-gray-800">État des charges</h2>
            <p className="text-xs text-gray-500 mt-0.5">Format bancaire multi-colonnes</p>
          </div>

          <div>
            <label className={labelCls}>Format de sortie</label>
            <FormatPicker value={eFormat} onChange={setEFormat} />
          </div>

          <div>
            <label className={labelCls}>Période de paie</label>
            <select className={inputCls} value={ePeriod} onChange={e=>setEPeriod(e.target.value)}>
              <option value="">— Sélectionner —</option>
              {periods.map(p=><option key={p.id} value={p.id}>{p.client_name} — {MOIS[p.period_month-1]} {p.period_year}</option>)}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={eRegul} onChange={e=>setERegul(e.target.checked)} className="h-4 w-4 rounded" />
            Inclure colonne régularisation IRPP
          </label>

          <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
            CNSS 4%+17,5% · AMU 5%+5% · IRPP selon barème CGI OTR 2025
          </div>

          <DownloadButton format={eFormat} loading={loading} onClick={() => downloadEtat(eFormat)} />
        </div>
      )}

      {/* ── Solde de tout compte ── */}
      {tab==='solde' && (
        <div className="bg-white rounded-2xl shadow p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-800">Solde de tout compte</h2>
            <p className="text-xs text-gray-500 mt-0.5">Document contractuel de fin de contrat</p>
          </div>

          <div>
            <label className={labelCls}>Format de sortie</label>
            <FormatPicker value={sFormat} onChange={setSFormat} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Client</label>
              <select className={inputCls} value={sClient} onChange={e=>{setSClient(e.target.value);setSEmployee('');setSPeriod('')}}>
                <option value="">— Sélectionner —</option>
                {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Employé</label>
              <select className={inputCls} value={sEmployee} onChange={e=>setSEmployee(e.target.value)} disabled={!sClient}>
                <option value="">— Sélectionner —</option>
                {employees.map(e=><option key={e.id} value={e.id}>{e.last_name} {e.first_name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Dernier bulletin (optionnel)</label>
            <select className={inputCls} value={sPeriod} onChange={e=>setSPeriod(e.target.value)}>
              <option value="">— Aucun —</option>
              {periods.filter(p=>p.client_id===sClient).map(p=><option key={p.id} value={p.id}>{MOIS[p.period_month-1]} {p.period_year}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Date de départ *</label><input type="date" className={inputCls} value={sDateDepart} onChange={e=>setSDateDepart(e.target.value)} /></div>
            <div><label className={labelCls}>Fin de contrat</label><input type="date" className={inputCls} value={sDateFin} onChange={e=>setSDateFin(e.target.value)} /></div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls}>Congés acquis non jouis</label>
              <div className="flex gap-1">
                {([true,false] as const).map(auto=>(
                  <button key={String(auto)} onClick={()=>setSTauxAuto(auto)}
                    className={`px-2 py-0.5 rounded text-xs ${sTauxAuto===auto?'bg-blue-600 text-white':'bg-gray-200 text-gray-600'}`}>
                    {auto?'Auto (jours/30)':'Manuel'}
                  </button>
                ))}
              </div>
            </div>
            {sJoursConges.map((j,i)=>(
              <div key={i} className="flex gap-2 mb-2">
                <input type="number" placeholder="Nb jours" className={`${inputCls} w-28`} value={j.nb} onChange={e=>{const n=[...sJoursConges];n[i].nb=e.target.value;setSJoursConges(n)}} />
                <input type="text" placeholder="Période ex: Jan-Juin 2025" className={inputCls} value={j.label} onChange={e=>{const n=[...sJoursConges];n[i].label=e.target.value;setSJoursConges(n)}} />
                {i>0&&<button onClick={()=>setSJoursConges(sJoursConges.filter((_,x)=>x!==i))} className="text-red-500 text-sm px-1">✕</button>}
              </div>
            ))}
            <button onClick={()=>setSJoursConges([...sJoursConges,{nb:'',label:''}])} className="text-blue-600 text-xs hover:underline">+ Ajouter période</button>
            {!sTauxAuto&&(<div className="mt-2"><label className={labelCls}>Taux manuel</label><input type="number" step="0.001" className={inputCls} value={sTauxManuel} onChange={e=>setSTauxManuel(e.target.value)} /></div>)}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Avance sur solde (FCFA)</label><input type="number" className={inputCls} value={sAvance} onChange={e=>setSAvance(e.target.value)} /></div>
            <div><label className={labelCls}>Retenues arriérées (FCFA)</label><input type="number" className={inputCls} value={sRetenuesArr} onChange={e=>setSRetenuesArr(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Retenue sur solde (FCFA)</label><input type="number" className={inputCls} value={sRetenueSurSolde} onChange={e=>setSRetenueSurSolde(e.target.value)} /></div>
            <div><label className={labelCls}>Régularisation IRPP (FCFA)</label><input type="number" className={inputCls} value={sRegulIrpp} onChange={e=>setSRegulIrpp(e.target.value)} /></div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={sInclurePreavis} onChange={e=>setSInclurePreavis(e.target.checked)} className="h-4 w-4 rounded" />
            Inclure préavis
          </label>
          {sInclurePreavis&&(<div><label className={labelCls}>Montant du préavis (FCFA)</label><input type="number" className={inputCls} value={sPreavis} onChange={e=>setSPreavis(e.target.value)} /></div>)}

          <DownloadButton format={sFormat} loading={loading} onClick={async () => {
            if (!sEmployee)   return setMsg({type:'error',text:'Sélectionne un employé'})
            if (!sDateDepart) return setMsg({type:'error',text:'Date de départ requise'})
            const emp = employees.find(e=>e.id===sEmployee)
            const joursConges = sJoursConges.filter(j=>j.nb&&parseFloat(j.nb)>0).map(j=>[parseFloat(j.nb),j.label])
            const body = {
              employee_id:sEmployee, period_id:sPeriod||undefined,
              date_depart:sDateDepart, date_fin_contrat:sDateFin||sDateDepart,
              jours_conges_list:joursConges, taux_conges_auto:sTauxAuto, taux_conges_manuel:parseFloat(sTauxManuel)||0,
              avance:parseFloat(sAvance)||0, preavis:parseFloat(sPreavis)||0, inclure_preavis:sInclurePreavis,
              retenues_arrierees:parseFloat(sRetenuesArr)||0, regularisation_irpp:parseFloat(sRegulIrpp)||0,
              retenue_sur_solde:parseFloat(sRetenueSurSolde)||0,
            }
            const filename = `Solde_${emp?.last_name||'employe'}_${sDateDepart}`

            if (sFormat === 'xlsx') {
              return downloadXlsx('/api/export-solde', body, `${filename}.xlsx`)
            }

            // PDF/PNG: générer le xlsx, le convertir via un PDF tabulaire
            setLoading(true); setMsg(null)
            try {
              // On demande le xlsx et on le convertit via un PDF simple
              const res = await fetch('/api/export-solde', { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...body, json:true}) })
              if (!res.ok) throw new Error('Erreur serveur')
              const data = await res.json()

              const { default: jsPDF } = await import('jspdf')
              const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' })
              const W = 210; const ML=15; const MR=195; const TW=MR-ML
              let y = 20

              // Titre
              doc.setFont('helvetica','bold'); doc.setFontSize(14)
              doc.text(data.title || 'SOLDE DE TOUT COMPTE', W/2, y, {align:'center'}); y+=8
              // Infos
              doc.setFont('helvetica','normal'); doc.setFontSize(10)
              if (data.depart)       { doc.text(`DEPART : ${data.depart}`, ML, y); y+=6 }
              if (data.embauche)     { doc.text(`DATE D'EMBAUCHE : ${data.embauche}`, ML, y); y+=6 }
              if (data.fin_contrat)  { doc.text(`FIN DE CONTRAT : ${data.fin_contrat}`, ML, y); y+=6 }
              if (data.anciennete)   { doc.text(`ANCIENNETE : ${data.anciennete}`, ML, y); y+=6 }
              y += 4

              // Tableau des lignes
              const rows = (data.lignes || []).map((l: any) => [l.label, l.base||'', l.taux||'', l.montant!=null?l.montant.toLocaleString('fr-FR'):''])
              const { default: autoTable } = await import('jspdf-autotable')
              autoTable(doc, {
                startY: y,
                head: [['Rubrique','Base','Taux','Montant']],
                body: rows,
                theme: 'striped',
                headStyles:{ fillColor:[217,225,242], textColor:[0,0,0], fontStyle:'bold', fontSize:9 },
                bodyStyles:{ fontSize:9 },
                columnStyles:{ 1:{halign:'right'}, 2:{halign:'center'}, 3:{halign:'right',fontStyle:'bold'} },
              })
              y = (doc as any).lastAutoTable.finalY + 6
              doc.setFont('helvetica','bold'); doc.setFontSize(11)
              doc.setFillColor(217,225,242); doc.rect(ML, y, TW, 10, 'F')
              doc.text('NET A PAYER', W/2-20, y+7)
              doc.text(data.net_payer!=null ? data.net_payer.toLocaleString('fr-FR')+' F' : '', MR-2, y+7, {align:'right'})
              doc.setFontSize(7); doc.setFont('helvetica','italic'); doc.setTextColor(140,140,140)
              doc.text(`Édité le ${new Date().toLocaleDateString('fr-FR')} · ElomPaie`, W/2, 287, {align:'center'})

              if (sFormat === 'pdf') { doc.save(`${filename}.pdf`) }
              else { await pdfToImagePng(doc, `${filename}.png`) }
              setMsg({type:'success',text:'Document généré'})
            } catch (e:any) { setMsg({type:'error',text:e.message}) }
            finally { setLoading(false) }
          }} />
        </div>
      )}
    </div>
  )
}
