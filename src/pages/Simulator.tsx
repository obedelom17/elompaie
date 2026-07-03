import { useState } from 'react'
import { calculatePayroll, formatXOF, calculateSeverancePay, getPreavisDays, PayrollInput } from '../lib/payroll'
import { FlaskConical, Calculator, RefreshCw, TrendingUp, Users, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'

const EMPTY: PayrollInput = {
  base_salary: 0, overtime_premium: 0, pregnancy_allowance: 0, function_allowance: 0,
  communication_allowance: 0, housing_premium: 0, meal_premium: 0, transport_allowance: 0,
  salary_advance: 0, loan_payment: 0, flat_deduction: 0,
  marital_status: 'celibataire', children_count: 0,
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
  const [sevCategory, setSevCategory] = useState('employé')

  const f = (key: keyof PayrollInput, val: any) => setForm(p => ({ ...p, [key]: val }))
  const fB = (key: keyof PayrollInput, val: any) => setFormB(p => ({ ...p, [key]: val }))

  const calc = () => setResult(calculatePayroll(form))
  const calcB = () => { setResult(calculatePayroll(form)); setResultB(calculatePayroll(formB)) }
  const reset = () => { setForm(EMPTY); setResult(null) }

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'bulletin', label: 'Simulateur de bulletin', icon: Calculator },
    { id: 'severance', label: 'Indemnité de licenciement', icon: TrendingUp },
    { id: 'compare', label: 'Comparaison A/B', icon: Users },
  ]

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-accent-600 flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          Simulateur de paie
        </h1>
        <p className="text-slate-500 mt-1 ml-13">Calcul sans enregistrement · CGI OTR 2025</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${tab === t.id ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* === BULLETIN === */}
      {tab === 'bulletin' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-5">
            <div className="card p-6">
              <h3 className="font-bold text-slate-900 mb-4">Informations personnelles</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Situation matrimoniale</label>
                  <select value={form.marital_status} onChange={e => f('marital_status', e.target.value)} className="input">
                    <option value="celibataire">Célibataire</option>
                    <option value="marie">Marié(e)</option>
                    <option value="divorce">Divorcé(e)</option>
                    <option value="veuf">Veuf/Veuve</option>
                  </select>
                </div>
                <div>
                  <label className="label">Enfants à charge</label>
                  <input type="number" min="0" max="6" value={form.children_count}
                    onChange={e => f('children_count', Number(e.target.value))} className="input" />
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-bold text-slate-900 mb-4">Éléments de salaire</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { k: 'base_salary', l: 'Salaire de base *' },
                  { k: 'overtime_premium', l: 'Sursalaire' },
                  { k: 'function_allowance', l: 'Indemnité de fonction' },
                  { k: 'communication_allowance', l: 'Indemnité communication' },
                  { k: 'housing_premium', l: 'Prime de logement' },
                  { k: 'meal_premium', l: 'Prime de repas' },
                  { k: 'transport_allowance', l: 'Indemnité transport' },
                  { k: 'pregnancy_allowance', l: 'Indemnité grossesse' },
                ].map(({ k, l }) => (
                  <div key={k}>
                    <label className="label">{l}</label>
                    <input type="number" min="0" value={(form as any)[k]}
                      onChange={e => f(k as any, Number(e.target.value))} className="input" />
                  </div>
                ))}
              </div>

              <button onClick={() => setShowAdvanced(!showAdvanced)}
                className="mt-4 flex items-center gap-2 text-sm text-slate-500 hover:text-primary-600 transition-colors">
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Retenues et déductions
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100">
                  {[
                    { k: 'flat_deduction', l: 'Déduction forfaitaire' },
                    { k: 'salary_advance', l: 'Avance sur salaire' },
                    { k: 'loan_payment', l: 'Remboursement prêt' },
                  ].map(({ k, l }) => (
                    <div key={k}>
                      <label className="label">{l}</label>
                      <input type="number" min="0" value={(form as any)[k]}
                        onChange={e => f(k as any, Number(e.target.value))} className="input" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={calc} className="btn-primary flex-1 py-3">
                <Calculator className="w-4 h-4" /> Simuler
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
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse-soft" />
                Résultat simulé
              </h3>

              {/* Gauge visuelle */}
              <div className="mb-5 p-4 bg-gradient-to-br from-primary-50 to-accent-50 rounded-2xl">
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                  <span>Brut</span><span>Net</span>
                </div>
                <div className="h-3 bg-white rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary-500 to-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: result.gross_salary > 0 ? `${Math.round(result.net_payable / result.gross_salary * 100)}%` : '0%' }} />
                </div>
                <p className="text-xs text-slate-500 mt-1 text-right">
                  {result.gross_salary > 0 ? Math.round(result.net_payable / result.gross_salary * 100) : 0}% du brut
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <Row l="Salaire brut" v={result.gross_salary} />
                <Row l="CNSS salarié (4%)" v={result.cnss_employee} neg />
                <Row l="AMU salarié (5%)" v={result.amu_employee} neg />
                <Row l="Abattement 28%" v={result.abattement_28} neg muted />
                <Row l={`Charges famille (${form.children_count + (form.marital_status === 'marie' ? 1 : 0)} pers.)`} v={result.charges_famille} neg muted />
                <Row l="Revenu imposable / mois" v={result.taxable_income_monthly} muted />
                <Row l="IRPP mensuel" v={result.irpp_net} neg />
                {form.salary_advance > 0 && <Row l="Avance sur salaire" v={form.salary_advance} neg />}
                {form.loan_payment > 0 && <Row l="Remboursement prêt" v={form.loan_payment} neg />}
                <div className="border-t-2 border-primary-100 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-slate-900">NET À PAYER</span>
                    <span className="font-black text-2xl text-primary-700">{formatXOF(result.net_payable)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Charges patronales</p>
                <div className="space-y-1 text-sm">
                  <Row l="CNSS employeur (17,5%)" v={result.cnss_employer} muted />
                  <Row l="AMU employeur (5%)" v={result.amu_employer} muted />
                  <Row l="Total charges patronales" v={result.employer_total} bold />
                  <div className="border-t border-slate-100 pt-2">
                    <Row l="Coût total employeur" v={result.gross_salary + result.employer_total} bold />
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-400">
                Revenu imposable annuel : {formatXOF(result.taxable_income_annual)} · IRPP annuel : {formatXOF(result.irpp_net * 12)}
              </div>
            </div>
          ) : (
            <div className="card p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-4">
                <FlaskConical className="w-8 h-8 text-violet-300" />
              </div>
              <p className="text-slate-400 text-sm">Renseignez les variables<br />et cliquez sur Simuler</p>
            </div>
          )}
        </div>
      )}

      {/* === INDEMNITÉ LICENCIEMENT === */}
      {tab === 'severance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6 space-y-4">
            <h3 className="font-bold text-slate-900">Paramètres</h3>
            <div>
              <label className="label">Salaire brut mensuel (FCFA)</label>
              <input type="number" min="0" value={sevSalary} onChange={e => setSevSalary(Number(e.target.value))} className="input" />
            </div>
            <div>
              <label className="label">Années de service</label>
              <input type="number" min="0" max="50" value={sevYears} onChange={e => setSevYears(Number(e.target.value))} className="input" />
            </div>
            <div>
              <label className="label">Catégorie professionnelle</label>
              <select value={sevCategory} onChange={e => setSevCategory(e.target.value)} className="input">
                <option value="ouvrier">Ouvrier / Journalier</option>
                <option value="employé">Employé / Assimilé</option>
                <option value="cadre">Cadre / Agent de maîtrise</option>
              </select>
            </div>
          </div>

          <div className="card p-6 space-y-5">
            <h3 className="font-bold text-slate-900">Résultat</h3>

            <div className="space-y-3">
              {sevYears >= 1 && (
                <div className="p-3 bg-blue-50 rounded-xl text-sm">
                  <p className="font-semibold text-blue-800">Tranches d'ancienneté</p>
                  {sevYears >= 1 && <p className="text-blue-600 mt-1">• Années 1–5 : {Math.min(sevYears, 5)} × {formatXOF(sevSalary)} × 35% = {formatXOF(Math.min(sevYears, 5) * sevSalary * 0.35)}</p>}
                  {sevYears > 5 && <p className="text-blue-600">• Années 6–10 : {Math.min(sevYears - 5, 5)} × {formatXOF(sevSalary)} × 40% = {formatXOF(Math.min(sevYears - 5, 5) * sevSalary * 0.40)}</p>}
                  {sevYears > 10 && <p className="text-blue-600">• Années +10 : {sevYears - 10} × {formatXOF(sevSalary)} × 45% = {formatXOF((sevYears - 10) * sevSalary * 0.45)}</p>}
                </div>
              )}

              <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl">
                <p className="text-sm text-slate-600">Indemnité totale</p>
                <p className="text-3xl font-black text-emerald-700 mt-1">{formatXOF(calculateSeverancePay(sevSalary, sevYears))}</p>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl text-sm">
                <p className="font-semibold text-amber-800">Délai de préavis</p>
                <p className="text-amber-700 mt-0.5">{getPreavisDays(sevCategory)}</p>
              </div>

              <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-xl text-xs text-slate-500">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Hors congés payés dus, indemnité de préavis et préjudice éventuel</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === COMPARAISON A/B === */}
      {tab === 'compare' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[{ label: 'Profil A', form, setF: f, color: 'primary' }, { label: 'Profil B', form: formB, setF: fB, color: 'violet' }].map(({ label, form: fm, setF, color }, idx) => (
              <div key={label} className="card p-6">
                <h3 className={`font-bold mb-4 text-${color}-700`}>{label}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Situation</label>
                    <select value={fm.marital_status} onChange={e => setF('marital_status', e.target.value)} className="input">
                      <option value="celibataire">Célibataire</option>
                      <option value="marie">Marié(e)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Enfants</label>
                    <input type="number" min="0" max="6" value={fm.children_count} onChange={e => setF('children_count', Number(e.target.value))} className="input" />
                  </div>
                  <div>
                    <label className="label">Salaire de base</label>
                    <input type="number" min="0" value={fm.base_salary} onChange={e => setF('base_salary', Number(e.target.value))} className="input" />
                  </div>
                  <div>
                    <label className="label">Primes total</label>
                    <input type="number" min="0" value={fm.function_allowance} onChange={e => setF('function_allowance', Number(e.target.value))} className="input" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={calcB} className="btn-primary w-full py-3">
            <Calculator className="w-4 h-4" /> Comparer les deux profils
          </button>

          {result && resultB && (
            <div className="card overflow-hidden page-enter">
              <div className="grid grid-cols-3 text-sm">
                <div className="p-4 bg-slate-50 font-bold text-slate-500 uppercase text-xs tracking-wide">Indicateur</div>
                <div className="p-4 text-center font-bold text-primary-700 bg-primary-50">Profil A</div>
                <div className="p-4 text-center font-bold text-violet-700 bg-violet-50">Profil B</div>
                {[
                  ['Salaire brut', result.gross_salary, resultB.gross_salary],
                  ['CNSS + AMU salarié', result.cnss_employee + result.amu_employee, resultB.cnss_employee + resultB.amu_employee],
                  ['IRPP mensuel', result.irpp_net, resultB.irpp_net],
                  ['NET À PAYER', result.net_payable, resultB.net_payable],
                  ['Charges patronales', result.employer_total, resultB.employer_total],
                  ['Coût employeur total', result.gross_salary + result.employer_total, resultB.gross_salary + resultB.employer_total],
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
