/**
 * Moteur de calcul de paie - CGI OTR 2025 + Code du Travail 2021
 */

const IRPP_TRANCHES = [
  [0, 900_000, 0.00],
  [900_000, 3_000_000, 0.03],
  [3_000_000, 6_000_000, 0.10],
  [6_000_000, 9_000_000, 0.15],
  [9_000_000, 12_000_000, 0.20],
  [12_000_000, 15_000_000, 0.25],
  [15_000_000, 20_000_000, 0.30],
  [20_000_000, Infinity, 0.35],
]

export function calcIrppAnnuel(revenu) {
  const r = Math.floor(revenu / 1000) * 1000
  let impot = 0
  for (const [bi, bs, taux] of IRPP_TRANCHES) {
    if (r <= bi) break
    impot += (Math.min(r, bs) - bi) * taux
  }
  return Math.floor(impot / 10) * 10
}

export function calcIrppMensuel(brut, persCharge = 0) {
  // Salaire brut imposable mensuel (après CNSS 4% + AMU 5%)
  const brutImposable = brut * (1 - 0.04 - 0.05)
  // Annualisation
  const annuel = brutImposable * 12
  // Abattement 28% plafonné à 10 000 000
  const abattement = Math.min(annuel, 10_000_000) * 0.28
  // Charges de famille : 10 000 F par personne à charge par mois × 12
  const chargesFamille = persCharge * 10_000 * 12
  // Revenu net imposable annuel (arrondi à la tranche inférieure de 1 000)
  const imposable = Math.floor(Math.max(0, annuel - abattement - chargesFamille) / 1000) * 1000
  // IRPP annuel selon barème → mensualisation
  return Math.round(calcIrppAnnuel(imposable) / 12)
}

// Conversion sûre en nombre. La base renvoie les NUMERIC sous forme de texte ("2000000.00") :
// sans cette conversion, les additions deviennent des concaténations.
export const n = (x) => { const v = Number(x); return Number.isFinite(v) ? v : 0 }

const NUMERIC_COLUMNS = [
  'base_salary','sursalaire','indemnite_grossesse','indemnite_fonction','indemnite_communication',
  'indemnite_logement','indemnite_repas','indemnite_transport','indemnite_anciennete',
  'avance_salaire','remboursement_pret','deduction_forfaitaire','heures_sup_25','heures_sup_50','heures_sup_100',
  'regularisation_irpp','children_count','period_month','period_year',
]

/** Convertit les colonnes numériques d'une ligne SQL en vrais nombres. */
/** Liste d'indemnités personnalisées nettoyée : [{ label, amount, cotisable }] */
export function parseCustomAllowances(raw) {
  let list = raw
  if (typeof raw === 'string') { try { list = JSON.parse(raw) } catch { list = [] } }
  if (!Array.isArray(list)) return []
  return list
    .map(a => ({ label: String(a?.label ?? '').trim().slice(0, 60), amount: Math.max(0, n(a?.amount)), cotisable: a?.cotisable !== false }))
    .filter(a => a.label && a.amount > 0)
    .slice(0, 20)
}

export function normalizeRow(row) {
  if (!row) return row
  const out = { ...row }
  if ('indemnites_perso' in out) out.indemnites_perso = parseCustomAllowances(out.indemnites_perso)
  for (const k of NUMERIC_COLUMNS) if (k in out && out[k] !== null && out[k] !== undefined) out[k] = n(out[k])
  return out
}

export function calcBrut(vars) {
  return n(vars.base_salary)
    + n(vars.sursalaire)
    + n(vars.indemnite_anciennete)
    + n(vars.indemnite_fonction)
    + n(vars.indemnite_communication)
    + n(vars.indemnite_logement)
    + n(vars.indemnite_repas)
    + n(vars.indemnite_transport)
    + n(vars.indemnite_grossesse)  // exonérée CNSS/AMU/IRPP (CGT art. 146)
    + parseCustomAllowances(vars.indemnites_perso).reduce((sum, a) => sum + a.amount, 0)
}

// RICF Togo (CGI art. 82) : 10 000 F/enfant à charge (max 6 enfants)
// Le conjoint n'est PAS inclus dans le RICF mensuel
export function calcPersonnesCharge(maritalStatus, children) {
  return Math.min(children || 0, 6)
}

/**
 * Calcul complet d'une paie à partir d'une ligne de variables (colonnes de la base).
 * Reproduit exactement le moteur de l'application (src/lib/payroll.ts) afin que
 * les exports, les aperçus et les écrans affichent les mêmes montants.
 */
export function calcPayrollFromRow(v) {
  const custom = parseCustomAllowances(v.indemnites_perso)
  const customCot = custom.filter(a => a.cotisable).reduce((sum, a) => sum + a.amount, 0)
  const customExo = custom.filter(a => !a.cotisable).reduce((sum, a) => sum + a.amount, 0)
  const cotisable = customCot +
    n(v.base_salary) + n(v.sursalaire) + n(v.indemnite_anciennete) + n(v.indemnite_fonction) +
    n(v.indemnite_communication) + n(v.indemnite_logement) + n(v.indemnite_repas) + n(v.indemnite_transport)
  const grossesse = n(v.indemnite_grossesse) + customExo
  const gross = cotisable + grossesse

  const cnss = Math.round(cotisable * 0.04)
  const amu  = Math.round(cotisable * 0.05)

  const brutImposable = cotisable - cnss - amu - n(v.deduction_forfaitaire)
  const revenuAnnuel  = brutImposable * 12
  const abatAnnuel    = Math.round(Math.min(revenuAnnuel, 10_000_000) * 0.28)
  const personnes     = calcPersonnesCharge(v.marital_status, n(v.children_count))
  let imposable       = Math.floor(Math.max(0, revenuAnnuel - abatAnnuel - personnes * 10_000 * 12) / 1000) * 1000
  if (v.arrondi_imposable === true) imposable = Math.floor(Math.round(imposable / 12) / 1000) * 1000 * 12
  const irpp          = Math.round(calcIrppAnnuel(imposable) / 12)

  const avance = n(v.avance_salaire)
  const pret   = n(v.remboursement_pret)
  const netLegal = gross - cnss - amu - irpp
  return {
    gross, cotisable, grossesse, cnss, amu, irpp, personnes,
    imposableMensuel: Math.round(imposable / 12),
    avance, pret,
    netLegal,
    net: netLegal - avance - pret,
    cnssPatronale: Math.round(cotisable * 0.175),
    amuPatronale: Math.round(cotisable * 0.05),
  }
}
