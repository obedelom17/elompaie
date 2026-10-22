import { useState } from 'react'
import { calculatePayroll, formatXOF, calculateSeverancePay, getPreavisDays, PayrollInput } from '../lib/payroll'
import { FlaskConical, Calculator, RefreshCw, TrendingUp, Users, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { t } from '../lib/i18n'

const EMPTY: PayrollInput = {
  base_salary: 0, overtime_premium: 0, function_allowance: 0,
  communication_allowance: 0, housing_premium: 0, meal_premium: 0, transport_allowance: 0,
  salary_advance: 0, loan_payment: 0, flat_deduction: 0,
  marital_status: 'celibataire', children_count: 0, indemnite_grossesse: 0,
}

type Tab = 'bulletin' | 'severance' | 'compare'

export default function Simulator() {
  const [tab, setTab] = useState<Tab>('bulletin')
  const [form, setForm] = useState<PayrollInput>(EMPTY)
  const [result, setResult] = useState<ReturnType<typeof calculatePayroll> | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Compare mode
  const [formB, setFormB] = useState<PayrollInput>(EMPTY)
  const [resultB, setResultB] = useState<ReturnType<typeof calculatePayroll> | null>(null)

  // Severance
  const [sevSalary, setSevSalary] = useState(0)
  const [sevYears, setSevYears] = useState(1)
  const [sevCategory, setSevCategory] = useState(t("employé"))

  const f = (key: keyof PayrollInput, val: any) => setForm(p => ({ ...p, [key]: val }))
  const fB = (key: keyof PayrollInput, val: any) => setFormB(p => ({ ...p, [key]: val }))

  const calc = () => setResult(calculatePayroll(form))
  const calcB = () => { setResult(calculatePayroll(form)); setResultB(calculatePayroll(formB)) }
  const reset = () => { setForm(EMPTY); setResult(null) }

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'bulletin', label: t("Simulateur de bulletin"), icon: Calculator },
    { id: 'severance', label: t("Indemnité de licenciement"), icon: TrendingUp },
    { id: 'compare', label: t('Comparaison A/B'), icon: Users },
  ]

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary-600 flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          {t("Simulateur de paie")}
        </h1>
        <p className="text-slate-500 mt-1 ml-13">{t("Calcul sans enregistrement · CGI OTR 2025")}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${tab === t.id ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* === BULLETIN === */}
      {tab === 'bulletin' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-5">
            <div className="card p-6">
              <h3 className="font-bold text-slate-900 mb-4">{t("Informations personnelles")}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">{t("Situation matrimoniale")}</label>
                  <select value={form.marital_status} onChange={e => f('marital_status', e.target.value)} className="input">
                    <option value="celibataire">{t("Célibataire")}</option>
                    <option value="marie">{t("Marié(e)")}</option>
                    <option value="divorce">{t("Divorcé(e)")}</option>
                    <option value="veuf">{t("Veuf/Veuve")}</option>
                  </select>
                </div>
                <div>
                  <label className="label">{t("Enfants à charge")}</label>
                  <input type="number" min="0" max="6" value={form.children_count === 0 ? '' : form.children_count} placeholder="0"
                    onChange={e => f('children_count', Number(e.target.value))} className="input" />
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-bold text-slate-900 mb-4">{t("Éléments de salaire")}</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { k: 'base_salary', l: t("Salaire de base *") },
                  { k: 'overtime_premium', l: t('Sursalaire') },
                  { k: 'function_allowance', l: t("Indemnité de fonction") },
                  { k: 'communication_allowance', l: t("Indemnité communication") },
                  { k: 'housing_premium', l: t("Prime de logement") },
                  { k: 'meal_premium', l: t("Prime de repas") },
                  { k: 'transport_allowance', l: t("Indemnité transport") },
                ].map(({ k, l }) => (
                  <div key={k}>
                    <label className="label">{l}</label>
                    <input type="number" min="0" value={(form as any)[k] === 0 ? '' : (form as any)[k]} placeholder="0"
                      onChange={e => f(k as any, Number(e.target.value))} className="input" />
                  </div>
                ))}
              </div>

              <button onClick={() => setShowAdvanced(!showAdvanced)}
                className="mt-4 flex items-center gap-2 text-sm text-slate-500 hover:text-primary-600 transition-colors">
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {t("Retenues et déductions")}
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100">
                  {[
                    { k: 'flat_deduction', l: t("Déduction forfaitaire") },
                    { k: 'salary_advance', l: t("Avance sur salaire") },
                    { k: 'loan_payment', l: t("Remboursement prêt") },
                  ].map(({ k, l }) => (
                    <div key={k}>
                      <label className="label">{l}</label>
                      <input type="number" min="0" value={(form as any)[k] === 0 ? '' : (form as any)[k]} placeholder="0"
                        onChange={e => f(k as any, Number(e.target.value))} className="input" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={calc} className="btn-primary flex-1 py-3">
                <Calculator className="w-4 h-4" /> {t("Simuler")}
              </button>
              <button onClick={reset} className="btn-ghost px-4">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Résultat */}
          {result ? (
            <div className="card p-6 page-enter">
              <h3 className="font-bold text-slate-900 mb-5 flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                {t("Résultat simulé")}
              </h3>

              {/* Gauge visuelle */}
              <div className="mb-5 p-4 bg-primary-50 rounded-lg">
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                  <span>{t("Brut")}</span><span>{t("Net")}</span>
                </div>
                <div className="h-3 bg-white rounded-full overflow-hidden">
                  <div className="h-full bg-primary-600 rounded-full transition-all duration-700"
                    style={{ width: result.gross_salary > 0 ? `${Math.round(result.net_payable / result.gross_salary * 100)}%` : '0%' }} />
                </div>
                <p className="text-xs text-slate-500 mt-1 text-right">
                  {result.gross_salary > 0 ? Math.round(result.net_payable / result.gross_salary * 100) : 0}{t("% du brut")}
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <Row l={t("Salaire brut")} v={result.gross_salary} />
                <Row l={t("CNSS salarié (4%)")} v={result.cnss_employee} neg />
                <Row l={t("AMU salarié (5%)")} v={result.amu_employee} neg />
                <Row l={t("Abattement 28%")} v={result.abattement_28} neg muted />
                <Row l={`${t("Charges famille")} (${Math.min(form.children_count, 6)} ${t("enfant(s)")})`} v={result.charges_famille} neg muted />
                <Row l={t("Revenu imposable / mois")} v={result.taxable_income_monthly} muted />
                <Row l={t("IRPP mensuel")} v={result.irpp_net} neg />
                {form.salary_advance > 0 && <Row l={t("Avance sur salaire")} v={form.salary_advance} neg />}
                {form.loan_payment > 0 && <Row l={t("Remboursement prêt")} v={form.loan_payment} neg />}
                <div className="border-t-2 border-primary-100 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-slate-900">{t("NET À PAYER")}</span>
                    <span className="font-black text-2xl text-primary-700">{formatXOF(result.net_payable)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">{t("Charges patronales")}</p>
                <div className="space-y-1 text-sm">
                  <Row l={t("CNSS employeur (17,5%)")} v={result.cnss_employer} muted />
                  <Row l={t("AMU employeur (5%)")} v={result.amu_employer} muted />
                  <Row l={t("Total charges patronales")} v={result.employer_total} bold />
                  <div className="border-t border-slate-100 pt-2">
                    <Row l={t("Coût total employeur")} v={result.gross_salary + result.employer_total} bold />
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-slate-50 rounded-md text-xs text-slate-400">
                {t("Revenu imposable annuel :")} {formatXOF(result.taxable_income_annual)} {t("· IRPP annuel :")} {formatXOF(result.irpp_net * 12)}
              </div>
            </div>
          ) : (
            <div className="card p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-lg bg-accent-50 flex items-center justify-center mb-4">
                <FlaskConical className="w-8 h-8 text-accent-300" />
              </div>
              <p className="text-slate-400 text-sm">{t("Renseignez les variables")}<br />{t("et cliquez sur Simuler")}</p>
            </div>
          )}
        </div>
      )}

      {/* === INDEMNITÉ LICENCIEMENT === */}
      {tab === 'severance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6 space-y-4">
            <h3 className="font-bold text-slate-900">{t("Paramètres")}</h3>
            <div>
              <label className="label">{t("Salaire brut mensuel (FCFA)")}</label>
              <input type="number" min="0" value={sevSalary === 0 ? '' : sevSalary} placeholder="0" onChange={e => setSevSalary(Number(e.target.value))} className="input" />
            </div>
            <div>
              <label className="label">{t("Années de service")}</label>
              <input type="number" min="0" max="50" value={sevYears === 0 ? '' : sevYears} placeholder="0" onChange={e => setSevYears(Number(e.target.value))} className="input" />
            </div>
            <div>
              <label className="label">{t("Catégorie professionnelle")}</label>
              <select value={sevCategory} onChange={e => setSevCategory(e.target.value)} className="input">
                <option value="ouvrier">{t("Ouvrier / Journalier")}</option>
                <option value="employé">{t("Employé / Assimilé")}</option>
                <option value="cadre">{t("Cadre / Agent de maîtrise")}</option>
              </select>
            </div>
          </div>

          <div className="card p-6 space-y-5">
            <h3 className="font-bold text-slate-900">{t("Résultat")}</h3>

            <div className="space-y-3">
              {sevYears >= 1 && (
                <div className="p-3 bg-primary-50 rounded-md text-sm">
                  <p className="font-semibold text-primary-800">{t("Tranches d'ancienneté")}</p>
                  {sevYears >= 1 && <p className="text-primary-600 mt-1">{t("• Années 1–5 :")} {Math.min(sevYears, 5)} × {formatXOF(sevSalary)} × 35% = {formatXOF(Math.min(sevYears, 5) * sevSalary * 0.35)}</p>}
                  {sevYears > 5 && <p className="text-primary-600">{t("• Années 6–10 :")} {Math.min(sevYears - 5, 5)} × {formatXOF(sevSalary)} × 40% = {formatXOF(Math.min(sevYears - 5, 5) * sevSalary * 0.40)}</p>}
                  {sevYears > 10 && <p className="text-primary-600">{t("• Années +10 :")} {sevYears - 10} × {formatXOF(sevSalary)} × 45% = {formatXOF((sevYears - 10) * sevSalary * 0.45)}</p>}
                </div>
              )}

              <div className="p-4 bg-emerald-50 rounded-lg">
                <p className="text-sm text-slate-600">{t("Indemnité totale")}</p>
                <p className="text-3xl font-black text-emerald-700 mt-1">{formatXOF(calculateSeverancePay(sevSalary, sevYears))}</p>
              </div>

              <div className="p-3 bg-amber-50 rounded-md text-sm">
                <p className="font-semibold text-amber-800">{t("Délai de préavis")}</p>
                <p className="text-amber-700 mt-0.5">{getPreavisDays(sevCategory)}</p>
              </div>

              <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-md text-xs text-slate-500">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{t("Hors congés payés dus, indemnité de préavis et préjudice éventuel")}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === COMPARAISON A/B === */}
      {tab === 'compare' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[{ label: t('Profil A'), form, setF: f, color: 'text-primary-700' }, { label: t('Profil B'), form: formB, setF: fB, color: 'text-accent-700' }].map(({ label, form: fm, setF, color }, idx) => (
              <div key={label} className="card p-6">
                <h3 className={`font-semibold mb-4 ${color}`}>{label}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">{t("Situation")}</label>
                    <select value={fm.marital_status} onChange={e => setF('marital_status', e.target.value)} className="input">
                      <option value="celibataire">{t("Célibataire")}</option>
                      <option value="marie">{t("Marié(e)")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">{t("Enfants")}</label>
                    <input type="number" min="0" max="6" value={fm.children_count === 0 ? '' : fm.children_count} placeholder="0" onChange={e => setF('children_count', Number(e.target.value))} className="input" />
                  </div>
                  <div>
                    <label className="label">{t("Salaire de base")}</label>
                    <input type="number" min="0" value={fm.base_salary === 0 ? '' : fm.base_salary} placeholder="0" onChange={e => setF('base_salary', Number(e.target.value))} className="input" />
                  </div>
                  <div>
                    <label className="label">{t("Primes total")}</label>
                    <input type="number" min="0" value={fm.function_allowance === 0 ? '' : fm.function_allowance} placeholder="0" onChange={e => setF('function_allowance', Number(e.target.value))} className="input" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={calcB} className="btn-primary w-full py-3">
            <Calculator className="w-4 h-4" /> {t("Comparer les deux profils")}
          </button>

          {result && resultB && (
            <div className="card overflow-hidden page-enter">
              <div className="grid grid-cols-3 text-sm">
                <div className="p-4 bg-slate-50 font-bold text-slate-500 uppercase text-xs tracking-wide">{t("Indicateur")}</div>
                <div className="p-4 text-center font-bold text-primary-700 bg-primary-50">{t("Profil A")}</div>
                <div className="p-4 text-center font-bold text-accent-700 bg-accent-50">{t("Profil B")}</div>
                {[
                  [t('Salaire brut'), result.gross_salary, resultB.gross_salary],
                  [t("CNSS + AMU salarié"), result.cnss_employee + result.amu_employee, resultB.cnss_employee + resultB.amu_employee],
                  [t('IRPP mensuel'), result.irpp_net, resultB.irpp_net],
                  [t("NET À PAYER"), result.net_payable, resultB.net_payable],
                  [t('Charges patronales'), result.employer_total, resultB.employer_total],
                  [t("Coût employeur total"), result.gross_salary + result.employer_total, resultB.gross_salary + resultB.employer_total],
                ].map(([label, a, b], i) => (
                  <>
                    <div key={`l${i}`} className={`p-3 px-4 text-slate-600 text-sm ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>{label}</div>
                    <div key={`a${i}`} className={`p-3 text-center font-semibold text-slate-900 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>{formatXOF(a as number)}</div>
                    <div key={`b${i}`} className={`p-3 text-center font-semibold text-slate-900 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                      {formatXOF(b as number)}
                      {(b as number) !== (a as number) && (
                        <span className={`ml-2 text-xs font-bold ${(b as number) > (a as number) ? 'text-red-500' : 'text-emerald-500'}`}>
                          {(b as number) > (a as number) ? '▲' : '▼'} {formatXOF(Math.abs((b as number) - (a as number)))}
                        </span>
                      )}
                    </div>
                  </>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ l, v, neg, muted, bold }: { l: string; v: number; neg?: boolean; muted?: boolean; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-1 ${bold ? 'font-bold' : ''}`}>
      <span className={muted ? 'text-slate-400' : 'text-slate-600'}>{l}</span>
      <span className={`tabular-nums ${neg ? 'text-red-600' : 'text-slate-900'}`}>{neg ? '− ' : ''}{formatXOF(Math.abs(v))}</span>
    </div>
  )
}
