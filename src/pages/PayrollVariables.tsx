import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { payrollApi, employeesApi } from '../lib/api'
import { calculatePayroll, formatXOF, PayrollResult, CustomAllowance } from '../lib/payroll'
import { ArrowLeft, Calculator, Save, Lock, Loader2, Search, Info, Download, Plus, Trash2 } from 'lucide-react'
import { t, monthName } from '../lib/i18n'

interface Employee { id: string; first_name: string; last_name: string; matricule: string|null; position: string|null; category: string|null; marital_status: string; children_count: number; client_id: string; email: string|null; phone: string|null; social_security_number: string|null; hire_date: string|null; client_name?: string }

const EMPTY_VARS = { base_salary: 0, seniority_allowance: 0, custom_allowances: [] as CustomAllowance[], overtime_premium: 0, function_allowance: 0, communication_allowance: 0, housing_premium: 0, meal_premium: 0, transport_allowance: 0, salary_advance: 0, loan_payment: 0, flat_deduction: 0, indemnite_grossesse: 0 }

export default function PayrollVariables() {
  const { periodId } = useParams<{ periodId: string }>()
  const [period, setPeriod] = useState<any>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [variables, setVariables] = useState<Map<string, any>>(new Map())
  const [loading, setLoading] = useState(true)
  const [selectedEmpId, setSelectedEmpId] = useState<string|null>(null)
  const [form, setForm] = useState(EMPTY_VARS)
  const [result, setResult] = useState<PayrollResult|null>(null)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [calculating, setCalculating] = useState(false)

  useEffect(() => { if (periodId) fetchData() }, [periodId])

  const fetchData = async () => {
    if (!periodId) return
    try {
      const [p, vars] = await Promise.all([
        payrollApi.getPeriod(periodId),
        payrollApi.listVariables(periodId),
      ])
      setPeriod(p)
      if (p) {
        const emps = await employeesApi.list(p.client_id)
        setEmployees(emps.filter((e: any) => e.active))
      }
      const varMap = new Map<string, any>()
      vars.forEach((v: any) => varMap.set(v.employee_id, v))
      setVariables(varMap)
    } catch {} finally { setLoading(false) }
  }

  const parseCustom = (raw: any): CustomAllowance[] => {
    let list = raw
    if (typeof raw === 'string') { try { list = JSON.parse(raw) } catch { list = [] } }
    return Array.isArray(list)
      ? list.map((a: any) => ({ label: String(a.label ?? ''), amount: Number(a.amount) || 0, cotisable: a.cotisable !== false }))
      : []
  }

  // Noms déjà utilisés dans cette période : proposés à la saisie
  const knownCustomLabels = Array.from(new Set(
    Array.from(variables.values()).flatMap((row: any) => parseCustom(row.indemnites_perso).map(a => a.label)).filter(Boolean)
  ))

  const updateCustom = (index: number, patch: Partial<CustomAllowance>) =>
    setForm({ ...form, custom_allowances: form.custom_allowances.map((a, i) => i === index ? { ...a, ...patch } : a) })
  const addCustom = () =>
    setForm({ ...form, custom_allowances: [...form.custom_allowances, { label: '', amount: 0, cotisable: true }] })
  const removeCustom = (index: number) =>
    setForm({ ...form, custom_allowances: form.custom_allowances.filter((_, i) => i !== index) })

  const formFromRow = (row: any) => ({
    base_salary:             Number(row.base_salary)            || 0,
    seniority_allowance:     Number(row.indemnite_anciennete)   || 0,
    custom_allowances:       parseCustom(row.indemnites_perso),
    overtime_premium:        Number(row.sursalaire)             || 0,
    function_allowance:      Number(row.indemnite_fonction)     || 0,
    communication_allowance: Number(row.indemnite_communication)|| 0,
    housing_premium:         Number(row.indemnite_logement)     || 0,
    meal_premium:            Number(row.indemnite_repas)        || 0,
    transport_allowance:     Number(row.indemnite_transport)    || 0,
    salary_advance:          Number(row.avance_salaire)         || 0,
    loan_payment:            Number(row.remboursement_pret)     || 0,
    flat_deduction:          Number(row.deduction_forfaitaire)  || 0,
    indemnite_grossesse:     Number(row.indemnite_grossesse)    || 0,
  })

  const buildInput = (f: typeof EMPTY_VARS, emp: Employee) => ({
    ...f,
    marital_status: emp.marital_status,
    children_count: emp.children_count,
  })

  const selectEmployee = (emp: Employee) => {
    setSelectedEmpId(emp.id)
    const existing = variables.get(emp.id)
    if (existing) {
      const f = formFromRow(existing)
      setForm(f)
      setResult(calculatePayroll(buildInput(f, emp)))
    } else {
      setForm({ ...EMPTY_VARS })
      setResult(null)
    }
  }

  const handleCalculate = () => {
    if (!selectedEmpId) return
    const emp = employees.find(e => e.id === selectedEmpId)
    if (!emp) return
    setCalculating(true)
    setResult(calculatePayroll(buildInput(form, emp)))
    setCalculating(false)
  }

  const saveVariables = async () => {
    if (!selectedEmpId || !periodId) return
    const payload = {
      employee_id: selectedEmpId,
      period_id: periodId,
      base_salary: form.base_salary || 0,
      sursalaire: form.overtime_premium || 0,
      indemnite_fonction: form.function_allowance || 0,
      indemnite_communication: form.communication_allowance || 0,
      indemnite_logement: form.housing_premium || 0,
      indemnite_repas: form.meal_premium || 0,
      indemnite_transport: form.transport_allowance || 0,
      indemnite_anciennete: form.seniority_allowance || 0,
      indemnites_perso: form.custom_allowances.filter(a => a.label.trim() && a.amount > 0),
      avance_salaire: form.salary_advance || 0,
      remboursement_pret: form.loan_payment || 0,
      deduction_forfaitaire: form.flat_deduction || 0,
      indemnite_grossesse: form.indemnite_grossesse || 0,
    }
    const saved = await payrollApi.saveVariables(payload)
    const newMap = new Map(variables)
    newMap.set(selectedEmpId, saved)
    setVariables(newMap)
    return saved
  }

  const handleSave = async () => {
    if (!selectedEmpId || !periodId) return
    setSaving(true)
    try { await saveVariables() } catch(e: any) { alert(e.message) } finally { setSaving(false) }
  }

  const handleDownloadXlsx = async () => {
    if (!selectedEmpId || !periodId) return
    setSaving(true)
    try {
      // Sauvegarder d'abord les variables
      await saveVariables()
      // Puis télécharger
      const res = await fetch('/api/export-bulletin', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_id: periodId, employee_id: selectedEmpId }),
      })
      if (!res.ok) { const e = await res.json().catch(()=>({error:t("Erreur")})); alert(e.error); return }
      const blob = await res.blob()
      const emp = employees.find(e => e.id === selectedEmpId)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `Bulletin_${emp?.last_name||'employe'}_${period?.period_month}_${period?.period_year}.xlsx`
      a.click()
    } catch(e: any) { alert(e.message) } finally { setSaving(false) }
  }

  const handleClosePeriod = async () => {
    if (!periodId || !period) return
    if (!confirm(t("Clôturer cette période ?"))) return
    await payrollApi.updatePeriod(periodId, { status: 'closed', closed_at: new Date().toISOString() })
    fetchData()
  }

  const filteredEmployees = employees.filter(e => `${e.first_name} ${e.last_name}`.toLowerCase().includes(search.toLowerCase()))
  const isClosed = period?.status === 'closed'
  const selectedEmp = employees.find(e => e.id === selectedEmpId)

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
  if (!period) return <div className="text-center py-12"><p className="text-slate-500">{t("Période introuvable.")}</p><Link to="/payroll" className="btn-primary mt-4 inline-flex">{t("Retour")}</Link></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link to="/payroll" className="btn-ghost"><ArrowLeft className="w-4 h-4" /> {t("Retour")}</Link>
          <div><h1 className="text-2xl font-bold text-slate-900">{monthName(period.period_month-1)} {period.period_year}</h1><p className="text-slate-500">{period.client_name}</p></div>
        </div>
        <div className="flex items-center gap-3">
          {isClosed ? <span className="badge-success">{t("Période clôturée")}</span> : <button onClick={handleClosePeriod} className="btn-secondary"><Lock className="w-4 h-4" /> {t("Clôturer")}</button>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" value={search} onChange={e => setSearch(e.target.value)} className="input pl-10" placeholder={t("Rechercher...")} /></div>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {filteredEmployees.length === 0 ? <p className="text-center text-slate-500 py-8 text-sm">{t("Aucun employé actif.")}</p>
                : filteredEmployees.map(emp => {
                  const hasVars = variables.has(emp.id)
                  return (
                    <button key={emp.id} onClick={() => selectEmployee(emp)} disabled={isClosed}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-slate-50 transition-colors disabled:cursor-not-allowed ${selectedEmpId === emp.id ? 'bg-primary-50 border-l-4 border-l-primary-600' : 'hover:bg-slate-50'}`}>
                      <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium text-sm flex-shrink-0">{emp.first_name[0]}{emp.last_name[0]}</div>
                      <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-900 truncate">{emp.first_name} {emp.last_name}</p><p className="text-xs text-slate-500 truncate">{emp.position || '—'}</p></div>
                      {hasVars && <span className="badge-info flex-shrink-0">{t("Calculé")}</span>}
                    </button>
                  )
                })
              }
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {!selectedEmp ? (
            <div className="card p-12 text-center"><Calculator className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">{t("Sélectionnez un employé.")}</p></div>
          ) : (
            <div className="space-y-6">
              <div className="card p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">{selectedEmp.first_name[0]}{selectedEmp.last_name[0]}</div>
                  <div><h3 className="font-semibold text-slate-900">{selectedEmp.first_name} {selectedEmp.last_name}</h3><p className="text-sm text-slate-500">{selectedEmp.position||'—'} · {selectedEmp.category||'—'}</p></div>
                  <div className="ml-auto text-right text-sm text-slate-500"><p className="capitalize">{selectedEmp.marital_status}</p><p>{selectedEmp.children_count} {t("enfant(s)")}</p></div>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="font-semibold text-slate-900 mb-5">{t("Variables de paie")}</h3>
                <div className="space-y-7">
                  {[
                    { title: t("Rémunération"), fields: [
                      { key: 'base_salary', label: t("Salaire de base") }, { key: 'overtime_premium', label: t("Sursalaire") },
                      { key: 'seniority_allowance', label: t("Indemnité d'ancienneté") },
                    ]},
                    { title: t("Indemnités et primes"), fields: [
                      { key: 'function_allowance', label: t("Ind. de fonction") }, { key: 'communication_allowance', label: t("Ind. communication") },
                      { key: 'housing_premium', label: t("Prime logement") }, { key: 'meal_premium', label: t("Prime repas") },
                      { key: 'transport_allowance', label: t("Ind. transport") },
                    ]},
                    { title: t("Retenues"), fields: [
                      { key: 'flat_deduction', label: t("Déduction forfaitaire") }, { key: 'salary_advance', label: t("Avance salaire") },
                      { key: 'loan_payment', label: t("Remb. prêt") },
                    ]},
                  ].map((section, idx) => (
                    <section key={section.title}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs font-semibold tabular-nums text-accent-600">0{idx + 1}</span>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{section.title}</h4>
                        <span className="flex-1 h-px bg-slate-200" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {section.fields.map(({ key, label }) => (
                          <div key={key}>
                            <label className="label">{label}</label>
                            <div className="relative">
                              <input type="number" min="0" disabled={isClosed} value={(form as any)[key] === 0 ? '' : (form as any)[key]} placeholder="0"
                                onChange={e => setForm({ ...form, [key]: e.target.value === '' ? 0 : Number(e.target.value) })}
                                onFocus={e => e.target.select()} className="input pr-9 text-right" />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">F</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                  <section>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-semibold tabular-nums text-accent-600">04</span>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t("Indemnités personnalisées")}</h4>
                      <span className="flex-1 h-px bg-slate-200" />
                    </div>
                    <datalist id="custom-allowance-labels">
                      {knownCustomLabels.map(l => <option key={l} value={l} />)}
                    </datalist>
                    {form.custom_allowances.length === 0 && (
                      <p className="text-sm text-slate-500 mb-3">{t("Aucune indemnité personnalisée. Ajoutez celles propres à ce salarié.")}</p>
                    )}
                    <div className="space-y-3">
                      {form.custom_allowances.map((a, i) => (
                        <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_180px_auto_auto] gap-3 items-end">
                          <div>
                            <label className="label">{t("Nom de l'indemnité")}</label>
                            <input type="text" list="custom-allowance-labels" disabled={isClosed} value={a.label} maxLength={60}
                              placeholder={t("Ex : Prime de risque")} onChange={e => updateCustom(i, { label: e.target.value })} className="input" />
                          </div>
                          <div>
                            <label className="label">{t("Montant")}</label>
                            <div className="relative">
                              <input type="number" min="0" disabled={isClosed} value={a.amount === 0 ? '' : a.amount} placeholder="0"
                                onChange={e => updateCustom(i, { amount: e.target.value === '' ? 0 : Number(e.target.value) })}
                                onFocus={e => e.target.select()} className="input pr-9 text-right" />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">F</span>
                            </div>
                          </div>
                          <label className="flex items-center gap-2 text-sm text-slate-600 h-10 cursor-pointer select-none">
                            <input type="checkbox" disabled={isClosed} checked={a.cotisable !== false}
                              onChange={e => updateCustom(i, { cotisable: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
                            {t("Soumise aux cotisations")}
                          </label>
                          <button type="button" disabled={isClosed} onClick={() => removeCustom(i)} className="btn-ghost h-10" aria-label={t("Supprimer")}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button type="button" disabled={isClosed || form.custom_allowances.length >= 20} onClick={addCustom} className="btn-secondary mt-3">
                      <Plus className="w-4 h-4" />
                      {t("Ajouter une indemnité")}
                    </button>
                  </section>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={handleCalculate} disabled={isClosed||calculating} className="btn-primary">
                    {calculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />} {t("Calculer")}
                  </button>
                  <button onClick={handleSave} disabled={isClosed||saving} className="btn-secondary">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {t("Enregistrer")}
                  </button>
                  <button onClick={handleDownloadXlsx} disabled={isClosed||saving} className="btn-ghost text-emerald-600 hover:bg-emerald-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} {t("Bulletin xlsx")}
                  </button>
                </div>
              </div>

              {result && (
                <div className="card p-6 page-enter">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="font-semibold text-slate-900">{t("Résultats du calcul")}</h3>
                    <span className="text-xs text-slate-400 flex items-center gap-1"><Info className="w-3 h-3" /> {t("CGI OTR 2025")}</span>
                  </div>
                  <div className="space-y-1">
                    <ResultRow label={t("Salaire brut")} value={result.gross_salary} />
                    {result.seniority_allowance > 0 && <ResultRow label={t("dont ind. ancienneté")} value={result.seniority_allowance} muted />}
                    <ResultRow label={t("CNSS salarié (4%)")} value={-result.cnss_employee} negative />
                    <ResultRow label={t("AMU salarié (5%)")} value={-result.amu_employee} negative />
                    <ResultRow label={t("Abattement 28%")} value={-result.abattement_28} negative muted />
                    <ResultRow label={t("Charges famille")} value={-result.charges_famille} negative muted />
                    <ResultRow label={t("Revenu imposable")} value={result.taxable_income_monthly} muted />
                    <ResultRow label={t("IRPP mensuel")} value={-result.irpp_net} negative />
                    {form.salary_advance > 0 && <ResultRow label={t("Avance sur salaire")} value={-form.salary_advance} negative />}
                    {form.loan_payment > 0 && <ResultRow label={t("Remboursement prêt")} value={-form.loan_payment} negative />}
                    <div className="border-t border-slate-200 pt-2 mt-2"><ResultRow label={t("NET À PAYER")} value={result.net_payable} bold /></div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">{t("Charges patronales")}</p>
                    <div className="space-y-1">
                      <ResultRow label={t("CNSS employeur (17,5%)")} value={result.cnss_employer} muted />
                      <ResultRow label={t("AMU employeur (5%)")} value={result.amu_employer} muted />
                      <ResultRow label={t("Total charges patronales")} value={result.employer_total} bold />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ResultRow({ label, value, negative, bold, muted }: { label: string; value: number; negative?: boolean; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex items-baseline gap-2 py-1.5 ${bold ? 'text-base font-semibold' : 'text-sm'}`}>
      <span className={muted ? 'text-slate-500' : 'text-slate-700'}>{label}</span>
      <span className="flex-1 border-b border-dotted border-slate-300 translate-y-[-3px]" aria-hidden />
      <span className={`tabular-nums ${negative ? 'text-error-600' : 'text-slate-900'} ${bold ? 'text-lg' : ''}`}>
        {negative ? '− ' : ''}{formatXOF(Math.abs(value))}
      </span>
    </div>
  )
}
