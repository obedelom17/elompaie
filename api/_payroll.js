/**
 * Moteur de calcul de paie - CGI OTR 2025 + Code du Travail 2021
 */

const IRPP_TRANCHES = [
  [0, 900_000, 0.00],
  [900_001, 3_000_000, 0.03],
  [3_000_001, 6_000_000, 0.10],
  [6_000_001, 9_000_000, 0.15],
  [9_000_001, 12_000_000, 0.20],
  [12_000_001, 15_000_000, 0.25],
  [15_000_001, 20_000_000, 0.30],
  [20_000_001, Infinity, 0.35],
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

export function calcAnciete(hireDate, baseSalary, sursalaire) {
  if (!hireDate) return 0
  const mois = Math.floor((Date.now() - new Date(hireDate)) / (1000 * 60 * 60 * 24 * 30))
  const ann = Math.floor(mois / 12)
  if (ann < 2) return 0
  return Math.round((baseSalary + sursalaire) * ann * 0.02)
}

export function calcBrut(vars) {
  return (vars.base_salary || 0)
    + (vars.sursalaire || 0)
    + (vars.indemnite_fonction || 0)
    + (vars.indemnite_communication || 0)
    + (vars.indemnite_logement || 0)
    + (vars.indemnite_repas || 0)
    + (vars.indemnite_transport || 0)
}

export function calcPersonnesCharge(maritalStatus, children) {
  return (maritalStatus === 'marie' ? 1 : 0) + (children || 0)
}
