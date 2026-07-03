// Moteur de calcul de paie - Togo


export interface PayrollInput {
  base_salary: number
  overtime_hours?: number
  overtime_rate?: 'h1' | 'h2' | 'h3' // +15% / +50% / +100%
  overtime_premium: number
  pregnancy_allowance: number
  function_allowance: number
  communication_allowance: number
  housing_premium: number
  meal_premium: number
  transport_allowance: number
  thirteenth_month?: number      // 13ème mois
  exceptional_bonus?: number     // prime exceptionnelle
  salary_advance: number
  loan_payment: number
  flat_deduction: number
  marital_status: string
  children_count: number
}

export interface PayrollResult {
  gross_salary: number
  cnss_employee: number
  amu_employee: number
  abattement_28: number
  charges_famille: number
  taxable_income_annual: number
  taxable_income_monthly: number
  irpp_brut: number
  irpp_net: number
  total_deductions: number
  net_payable: number
  cnss_employer: number
  amu_employer: number
  employer_total: number
  overtime_amount: number
  // compat DB
  ricf: number
  taxable_income: number
  irpp_brut_display: number
}

const CNSS_EMPLOYEE_RATE  = 0.04
const CNSS_EMPLOYER_RATE  = 0.175
const AMU_EMPLOYEE_RATE  = 0.05
const AMU_EMPLOYER_RATE  = 0.05

// Barème IRPP annuel
const ITS_BRACKETS = [
  { min: 0,          max: 900_000,    rate: 0 },
  { min: 900_000,    max: 3_000_000,  rate: 0.03 },
  { min: 3_000_000,  max: 6_000_000,  rate: 0.10 },
  { min: 6_000_000,  max: 9_000_000,  rate: 0.15 },
  { min: 9_000_000,  max: 12_000_000, rate: 0.20 },
  { min: 12_000_000, max: 15_000_000, rate: 0.25 },
  { min: 15_000_000, max: 20_000_000, rate: 0.30 },
  { min: 20_000_000, max: Infinity,   rate: 0.35 },
]

export function getPersonnesACharge(maritalStatus: string, childrenCount: number): number {
  let p = maritalStatus === 'marie' ? 1 : 0
  return p + Math.min(childrenCount, 6)
}

function calcItsBrutAnnual(revenu: number): number {
  let its = 0
  for (const b of ITS_BRACKETS) {
    if (revenu <= b.min) break
    its += (Math.min(revenu, b.max) - b.min) * b.rate
  }
  return Math.floor(its / 10) * 10
}

// Heures supplémentaires
// h1=+15% (41-48h), h2=+50% (nuit/dim), h3=+100% (nuit dim/férié)
export function calcOvertimePay(baseSalary: number, hours: number, rate: 'h1'|'h2'|'h3' = 'h1'): number {
  const hourlyRate = baseSalary / 173.33
  const multiplier = rate === 'h1' ? 1.15 : rate === 'h2' ? 1.50 : 2.00
  return Math.round(hourlyRate * hours * multiplier)
}

// Congés payés : 2,5 jours/mois ouvrés
export function calcCongesPayes(baseSalary: number, monthsWorked: number): number {
  const joursAcquis = 2.5 * monthsWorked
  const indemnite = (baseSalary / 30) * joursAcquis
  return Math.round(indemnite)
}

// Ancienneté auto depuis date d'embauche
export function calcAnciennete(hireDateStr: string | null): { years: number; months: number; label: string } {
  if (!hireDateStr) return { years: 0, months: 0, label: '—' }
  const hire = new Date(hireDateStr)
  const now  = new Date()
  let years  = now.getFullYear() - hire.getFullYear()
  let months = now.getMonth() - hire.getMonth()
  if (months < 0) { years--; months += 12 }
  return {
    years, months,
    label: years > 0 ? `${years} an${years > 1 ? 's' : ''} ${months}m` : `${months} mois`
  }
}

export function calculatePayroll(input: PayrollInput): PayrollResult {
  const overtime_amount = input.overtime_hours && input.base_salary
    ? calcOvertimePay(input.base_salary, input.overtime_hours, input.overtime_rate || 'h1')
    : 0

  const gross_salary =
    (input.base_salary        || 0) +
    overtime_amount +
    (input.overtime_premium   || 0) +
    (input.pregnancy_allowance|| 0) +
    (input.function_allowance || 0) +
    (input.communication_allowance || 0) +
    (input.housing_premium    || 0) +
    (input.meal_premium       || 0) +
    (input.transport_allowance|| 0) +
    (input.thirteenth_month   || 0) +
    (input.exceptional_bonus  || 0)

  const cnss_employee = Math.round(gross_salary * CNSS_EMPLOYEE_RATE)
  const amu_employee = Math.round(gross_salary * AMU_EMPLOYEE_RATE)

  const revenuApresCot = gross_salary - cnss_employee - amu_employee - (input.flat_deduction || 0)
  const revenuAnnuel   = revenuApresCot * 12
  const baseAbat       = Math.min(revenuAnnuel, 10_000_000)
  const abat_annual    = Math.round(baseAbat * 0.28)
  const abattement_28  = Math.round(abat_annual / 12)

  const revApresAbat   = Math.max(0, revenuAnnuel - abat_annual)
  const personnes      = getPersonnesACharge(input.marital_status, input.children_count || 0)
  const chargesFamAnnual = personnes * 10_000 * 12
  const charges_famille  = personnes * 10_000

  const revImposable = Math.floor(Math.max(0, revApresAbat - chargesFamAnnual) / 1000) * 1000
  const irpp_annuel   = calcItsBrutAnnual(revImposable)
  const irpp_net      = Math.round(irpp_annuel / 12)
  const irpp_brut     = irpp_net

  const total_deductions =
    cnss_employee + amu_employee + irpp_net +
    (input.salary_advance || 0) + (input.loan_payment || 0)

  const net_payable    = gross_salary - total_deductions
  const cnss_employer  = Math.round(gross_salary * CNSS_EMPLOYER_RATE)
  const amu_employer  = Math.round(gross_salary * AMU_EMPLOYER_RATE)

  return {
    gross_salary, cnss_employee, amu_employee,
    abattement_28, charges_famille,
    taxable_income_annual: revImposable,
    taxable_income_monthly: Math.round(revImposable / 12),
    irpp_brut, irpp_net, total_deductions, net_payable,
    cnss_employer, amu_employer,
    employer_total: cnss_employer + amu_employer,
    overtime_amount,
    ricf: charges_famille,
    taxable_income: Math.round(revImposable / 12),
    irpp_brut_display: irpp_brut,
  }
}

// Indemnité licenciement
export function calculateSeverancePay(grossMonthlySalary: number, yearsOfService: number): number {
  if (yearsOfService < 1) return 0
  let ind = Math.min(yearsOfService, 5) * grossMonthlySalary * 0.35
  if (yearsOfService > 5)  ind += Math.min(yearsOfService - 5, 5) * grossMonthlySalary * 0.40
  if (yearsOfService > 10) ind += (yearsOfService - 10) * grossMonthlySalary * 0.45
  return Math.round(ind)
}

// Préavis
export function getPreavisDays(category: string): string {
  const c = category.toLowerCase()
  if (c.includes('heure') || c.includes('journalier')) return '15 jours'
  if (c.includes('cadre') || c.includes('maîtrise') || c.includes('technicien')) return '3 mois'
  return '1 mois'
}

export function formatXOF(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(amount)) + ' F'
}

export const MONTH_NAMES = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
]


// Les taux de majoration sont fixés par conventions collectives.
// En l'absence de convention: +25% standard, +50% nuit/dimanche, +100% dimanche/férié de nuit
// (pratique courante Togo en l'absence de convention collective applicable)
export const OT_RATES_LABEL = {
  h1: '+25% (heures supp. jour)',
  h2: '+50% (nuit ou dimanche)',
  h3: '+100% (nuit dimanche/férié)',
}

// Enfants à charge jusqu'à 25 ans si études/apprentissage
// L'employé doit déclarer cette situation — on garde children_count comme paramètre
// et on affiche un avertissement dans l'UI si children_count > 0

// ─── INDEMNITÉ MATERNITÉ ───────────────────────────────────────────────────
// 14 semaines congé maternité. 50% à charge employeur, 50% CNSS.
export function calcIndemniteMaterniteMensuelle(salaireBase: number): {
  partEmployeur: number
  partCNSS: number
  total: number
} {
  const mensuel = Math.round(salaireBase * 0.50)
  return {
    partEmployeur: mensuel,
    partCNSS: mensuel,
    total: salaireBase,
  }
}

// ─── INDEMNITÉ MALADIE ────────────────────────────────────────────────────
// <1 an : 30j demi-salaire
// 1–5 ans : 2 mois plein salaire
// >5 ans : 4 mois plein salaire
export function calcIndemniteMaladie(
  salaireBase: number,
  ancienneteAns: number
): { dureeLabel: string; montant: number } {
  if (ancienneteAns < 1) {
    return { dureeLabel: '30 jours (demi-salaire)', montant: Math.round(salaireBase * 0.5) }
  } else if (ancienneteAns <= 5) {
    return { dureeLabel: '2 mois (plein salaire)', montant: Math.round(salaireBase * 2) }
  } else {
    return { dureeLabel: '4 mois (plein salaire)', montant: Math.round(salaireBase * 4) }
  }
}

// ─── INDEMNITÉ COMPENSATRICE CONGÉS NON PRIS ──────────────────────────────
// Versée au départ si congés acquis non soldés.
// Base : 2,5 jours ouvrés/mois travaillé.
// Montant = (salaire journalier) × jours non pris
export function calcIndemniteCongésNonPris(
  salaireMensuelBrut: number,
  moisTravaillés: number,
  joursDejaPosésMoisCourant: number = 0
): { joursAcquis: number; joursNonPris: number; montant: number } {
  const joursAcquis = 2.5 * moisTravaillés
  const joursNonPris = Math.max(0, joursAcquis - joursDejaPosésMoisCourant)
  const tauxJournalier = salaireMensuelBrut / 26 // jours ouvrés/mois
  return {
    joursAcquis: Math.round(joursAcquis * 10) / 10,
    joursNonPris: Math.round(joursNonPris * 10) / 10,
    montant: Math.round(tauxJournalier * joursNonPris),
  }
}
