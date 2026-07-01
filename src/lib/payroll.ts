// Moteur de calcul de paie - Togo
// CGI OTR 2025 (Art. 26, 72, 73, 74) + Code du Travail 2021

export interface PayrollInput {
  base_salary: number
  overtime_premium: number
  pregnancy_allowance: number
  function_allowance: number
  communication_allowance: number
  housing_premium: number
  meal_premium: number
  transport_allowance: number
  salary_advance: number
  loan_payment: number
  flat_deduction: number
  marital_status: string
  children_count: number
}

export interface PayrollResult {
  gross_salary: number
  cnss_employee: number
  inam_employee: number
  abattement_28: number
  charges_famille: number
  taxable_income_annual: number
  taxable_income_monthly: number
  its_brut: number
  its_net: number
  total_deductions: number
  net_payable: number
  cnss_employer: number
  inam_employer: number
  employer_total: number
  // Gardés pour compat BDD mais redéfinis
  ricf: number
  taxable_income: number
  its_brut_display: number
}

// Taux CNSS / INAM (inchangés)
const CNSS_EMPLOYEE_RATE = 0.04
const CNSS_EMPLOYER_RATE = 0.175
const INAM_EMPLOYEE_RATE = 0.05
const INAM_EMPLOYER_RATE = 0.05

// Barème ITS ANNUEL - CGI Art. 74 (réforme 2023, en vigueur 2025)
// Tranches en FCFA annuels
const ITS_BRACKETS_ANNUAL = [
  { min: 0,          max: 900_000,    rate: 0.00 },
  { min: 900_000,    max: 3_000_000,  rate: 0.03 },
  { min: 3_000_000,  max: 6_000_000,  rate: 0.10 },
  { min: 6_000_000,  max: 9_000_000,  rate: 0.15 },
  { min: 9_000_000,  max: 12_000_000, rate: 0.20 },
  { min: 12_000_000, max: 15_000_000, rate: 0.25 },
  { min: 15_000_000, max: 20_000_000, rate: 0.30 },
  { min: 20_000_000, max: Infinity,   rate: 0.35 },
]

// Nombre de personnes à charge selon situation (conjoints + enfants ≤ 6 max)
export function getPersonnesACharge(maritalStatus: string, childrenCount: number): number {
  let personnes = 0
  if (maritalStatus === 'marie') personnes += 1 // conjoint sans revenus
  if (maritalStatus === 'veuf' && childrenCount === 0) personnes += 0
  personnes += Math.min(childrenCount, 6)
  return personnes
}

// ITS annuel brut par barème progressif (Art. 74)
function calculateItsBrutAnnual(revenuAnnuel: number): number {
  let its = 0
  for (const bracket of ITS_BRACKETS_ANNUAL) {
    if (revenuAnnuel > bracket.min) {
      const tranche = Math.min(revenuAnnuel, bracket.max) - bracket.min
      its += tranche * bracket.rate
    } else break
  }
  // Arrondi à la dizaine inférieure (Art. 74)
  return Math.floor(its / 10) * 10
}

export function calculatePayroll(input: PayrollInput): PayrollResult {
  // 1. Salaire brut mensuel
  const gross_salary =
    (input.base_salary || 0) +
    (input.overtime_premium || 0) +
    (input.pregnancy_allowance || 0) +
    (input.function_allowance || 0) +
    (input.communication_allowance || 0) +
    (input.housing_premium || 0) +
    (input.meal_premium || 0) +
    (input.transport_allowance || 0)

  // 2. Cotisations sociales salariales
  const cnss_employee = Math.round(gross_salary * CNSS_EMPLOYEE_RATE)
  const inam_employee = Math.round(gross_salary * INAM_EMPLOYEE_RATE)

  // 3. Abattement forfaitaire 28% (Art. 26 CGI) sur revenu après cotisations
  // Plafonné à revenus ≤ 10 000 000 F annuels
  const revenu_apres_cotisations_mensuel = gross_salary - cnss_employee - inam_employee - (input.flat_deduction || 0)
  const revenu_annuel_brut_apres_cot = revenu_apres_cotisations_mensuel * 12
  
  // Abattement 28% plafonné (10M annuel)
  const base_abattement = Math.min(revenu_annuel_brut_apres_cot, 10_000_000)
  const abattement_28_annual = Math.round(base_abattement * 0.28)
  const abattement_28 = Math.round(abattement_28_annual / 12)

  // 4. Revenu imposable après abattement (annuel)
  const revenu_apres_abattement_annual = Math.max(0, revenu_annuel_brut_apres_cot - abattement_28_annual)

  // 5. Déduction pour charges de famille (Art. 73 CGI)
  // 10 000 F/mois/personne à charge
  const personnes = getPersonnesACharge(input.marital_status, input.children_count || 0)
  const charges_famille_monthly = personnes * 10_000
  const charges_famille_annual = charges_famille_monthly * 12

  // 6. Revenu net imposable annuel (arrondi au millier inférieur - Art. 74)
  const revenu_imposable_avant_arrondi = Math.max(0, revenu_apres_abattement_annual - charges_famille_annual)
  const taxable_income_annual = Math.floor(revenu_imposable_avant_arrondi / 1000) * 1000

  // 7. ITS annuel par barème
  const its_annuel_brut = calculateItsBrutAnnual(taxable_income_annual)

  // 8. ITS mensuel
  const its_brut = Math.round(its_annuel_brut / 12)
  const its_net = Math.max(0, its_brut)

  // 9. Retenues totales et net à payer
  const total_deductions =
    cnss_employee +
    inam_employee +
    its_net +
    (input.salary_advance || 0) +
    (input.loan_payment || 0)

  const net_payable = gross_salary - total_deductions

  // 10. Charges patronales
  const cnss_employer = Math.round(gross_salary * CNSS_EMPLOYER_RATE)
  const inam_employer = Math.round(gross_salary * INAM_EMPLOYER_RATE)
  const employer_total = cnss_employer + inam_employer

  return {
    gross_salary,
    cnss_employee,
    inam_employee,
    abattement_28,
    charges_famille: charges_famille_monthly,
    taxable_income_annual,
    taxable_income_monthly: Math.round(taxable_income_annual / 12),
    its_brut,
    its_net,
    total_deductions,
    net_payable,
    cnss_employer,
    inam_employer,
    employer_total,
    // Compat BDD
    ricf: charges_famille_monthly,
    taxable_income: Math.round(taxable_income_annual / 12),
    its_brut_display: its_brut,
  }
}

// Calcul indemnité de licenciement (Art. 97 Code Travail 2021)
// 35% par an (1-5 ans) / 40% (6-10 ans) / 45% (>10 ans)
export function calculateSeverancePay(grossMonthlySalary: number, yearsOfService: number): number {
  if (yearsOfService < 1) return 0
  let indemnite = 0
  const y1 = Math.min(yearsOfService, 5)
  indemnite += y1 * grossMonthlySalary * 0.35
  if (yearsOfService > 5) {
    const y2 = Math.min(yearsOfService - 5, 5)
    indemnite += y2 * grossMonthlySalary * 0.40
  }
  if (yearsOfService > 10) {
    const y3 = yearsOfService - 10
    indemnite += y3 * grossMonthlySalary * 0.45
  }
  return Math.round(indemnite)
}

// Délai de préavis (Art. 74 Code Travail 2021)
export function getPreavisDays(category: string): string {
  const cat = category.toLowerCase()
  if (cat.includes('heure') || cat.includes('journalier')) return '15 jours'
  if (cat.includes('cadre') || cat.includes('agent de maîtrise') || cat.includes('technicien')) return '3 mois'
  return '1 mois' // ouvriers, employés, assimilés
}

export function formatXOF(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount)) + ' F'
}

export const MONTH_NAMES = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
]
