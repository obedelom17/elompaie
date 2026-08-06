import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatXOF, MONTH_NAMES, PayrollResult } from './payroll'

interface BulletinData {
  employee: any; period: any; variables: any; result: PayrollResult
  orgName: string; returnDoc?: boolean
}

const C_RED   : [number,number,number] = [192, 0, 0]
const C_BLACK : [number,number,number] = [0, 0, 0]
const C_WHITE : [number,number,number] = [255, 255, 255]
const C_NAVY  : [number,number,number] = [31, 56, 100]
const C_LGRAY : [number,number,number] = [242, 242, 242]
const C_DGRAY : [number,number,number] = [217, 217, 217]
const C_BLUE  : [number,number,number] = [217, 225, 242]

function fmt(v: number): string {
  if (!v) return '0'
  return Math.round(v).toLocaleString('fr-FR').replace(/\u202f/g, ' ')
}

export async function generateBulletinPDF(data: BulletinData): Promise<jsPDF> {
  const { employee, period, variables, result, returnDoc } = data
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210; const ML = 10; const MR = W - 10
  const TW = MR - ML // largeur totale = 190
  const monthName = MONTH_NAMES[period.period_month - 1].toUpperCase()
  const client = period.clients || {}
  const moisNum = String(period.period_month).padStart(2, '0')
  const lastDay = new Date(period.period_year, period.period_month, 0).getDate()

  // ── LOGO ────────────────────────────────────────────────────────────────────
  const logoW = 48; const logoH = 24
  let y = 8
  if (client.logo_url) {
    try {
      const resp = await fetch(client.logo_url)
      const blob = await resp.blob()
      const dataUrl = await new Promise<string>(res => {
        const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(blob)
      })
      doc.addImage(dataUrl, 'PNG', ML, y, logoW, logoH, '', 'FAST')
    } catch {}
  }

  // ── BULLETIN DE PAIE — fond gris, texte rouge ──────────────────────────────
  const bpX = ML + logoW + 2; const bpW = MR - bpX
  doc.setFillColor(...C_DGRAY)
  doc.rect(bpX, y, bpW, 10, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...C_RED)
  doc.text('BULLETIN DE PAIE', bpX + bpW / 2, y + 7, { align: 'center' })

  // ── Ligne rouge ────────────────────────────────────────────────────────────
  doc.setFillColor(...C_RED)
  doc.rect(bpX, y + 10, bpW, 1.2, 'F')

  // ── Période — fond gris clair ──────────────────────────────────────────────
  doc.setFillColor(...C_LGRAY)
  doc.rect(bpX, y + 11.5, bpW, 18, 'F')
  doc.setDrawColor(180,180,180); doc.setLineWidth(0.2)
  doc.rect(bpX, y + 11.5, bpW, 18)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...C_BLACK)
  doc.text(`MOIS DE: ${monthName}`, bpX + bpW / 2, y + 17, { align: 'center' })
  doc.text(`PERIODE DU:  01/${moisNum}/${period.period_year}`, bpX + bpW / 2, y + 22, { align: 'center' })
  doc.text(`AU:  ${lastDay}/${moisNum}/${period.period_year}`, bpX + bpW / 2, y + 27.5, { align: 'center' })

  y += 32

  // ── Entité — fond bleu marine, texte blanc ─────────────────────────────────
  doc.setFillColor(...C_NAVY)
  doc.rect(ML, y, TW, 10, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...C_WHITE)
  const entiteName = client.entite_name || client.name || ''
  doc.text(`Entité: ${entiteName}`, W / 2, y + 4.5, { align: 'center' })
  doc.setFontSize(8.5)
  const adresse = [client.address, client.bp ? `05 BP ${client.bp}` : ''].filter(Boolean).join('  ')
  doc.text(adresse, W / 2, y + 8.5, { align: 'center' })
  y += 10

  // ── N° Employeur / NIF / TEL — fond bleu marine ────────────────────────────
  doc.setFillColor(...C_NAVY)
  doc.rect(ML, y, TW, 12, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...C_WHITE)
  doc.text(
    `N° Employeur : ${client.num_employeur || ''}     NIF : ${client.nif || ''}`,
    W / 2, y + 4.5, { align: 'center' }
  )
  doc.setFontSize(8.5)
  doc.text(`TEL: ${client.phone || ''}`, W / 2, y + 9.5, { align: 'center' })
  y += 12

  // ── Infos employé ──────────────────────────────────────────────────────────
  doc.setDrawColor(180,180,180); doc.setLineWidth(0.2)
  doc.rect(ML, y, TW, 34)
  doc.setTextColor(...C_BLACK)
  const lx = ML + 36; const vx = ML + 38
  let iy = y + 5.5
  const lh = 4.2
  const infoLine = (label: string, val: string) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
    doc.text(label, lx, iy, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.text(val || '', vx, iy)
    iy += lh
  }
  infoLine('Nom & Prénoms :', `${employee.last_name || ''} ${employee.first_name || ''}`)
  infoLine('N°Assuré :', employee.social_security_number || employee.matricule || '')
  infoLine('NIF:', employee.nif || '')
  infoLine('Direction/section:', employee.category || '')
  infoLine('Poste/Fonction:', employee.position || '')
  infoLine('Téléphone:', employee.phone || '')
  infoLine("Date d'embauche:", employee.hire_date ? new Date(employee.hire_date).toLocaleDateString('fr-FR') : '')
  doc.setFont('helvetica', 'bold'); doc.text('Pers à charge', lx, iy, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.text(String(employee.children_count || 0), vx, iy)
  y += 34

  // ── Header tableau ─────────────────────────────────────────────────────────
  // Colonnes: Code | Rubriques | Base | Taux/NB | Retenues | Gains
  const cols = {
    codeX: ML,   codeW: 14,
    rubX:  ML+14, rubW: 60,
    baseX: ML+74, baseW: 30,
    tauxX: ML+104, tauxW: 22,
    retX:  ML+126, retW: 32,
    gainX: ML+158, gainW: MR-(ML+158),
  }
  const hH = 5.5
  doc.setFillColor(...C_BLUE)
  doc.rect(ML, y, TW, hH, 'F')
  doc.setDrawColor(160,160,160); doc.setLineWidth(0.25)
  doc.rect(ML, y, TW, hH)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...C_BLACK)
  doc.text('Code',     cols.codeX + cols.codeW/2, y+4,  { align: 'center' })
  doc.text('Rubriques',cols.rubX  + cols.rubW/2,  y+4,  { align: 'center' })
  doc.text('Base',     cols.baseX + cols.baseW,   y+4,  { align: 'right'  })
  doc.text('Taux/NB',  cols.tauxX + cols.tauxW,   y+4,  { align: 'right'  })
  doc.text('Retenues', cols.retX  + cols.retW,    y+4,  { align: 'right'  })
  doc.text('Gains',    cols.gainX + cols.gainW,   y+4,  { align: 'right'  })
  // Séparateurs verticaux
  ;[cols.rubX, cols.baseX, cols.tauxX, cols.retX, cols.gainX, MR].forEach(x => {
    doc.line(x, y, x, y + hH)
  })
  y += hH

  // ── Rubriques ──────────────────────────────────────────────────────────────
  const rH = 5
  const rubriques = [
    { label: 'Salaire de Base',           base: variables.base_salary       || 0 },
    { label: 'Sursalaire',                base: variables.overtime_premium   || 0 },
    { label: 'Ancienneté',                base: variables.anciennete         || 0 },
    { label: 'Indemnité de fonction',     base: variables.function_allowance || 0 },
    { label: 'Indemnité de logement',     base: variables.housing_premium    || 0 },
    { label: 'Indemnité de Transport',    base: variables.transport_allowance|| 0 },
    { label: 'Indemnité de repas',        base: variables.meal_premium       || 0 },
    { label: 'Indemnité de communication',base: variables.communication_allowance || 0 },
  ]

  doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
  for (const rub of rubriques) {
    doc.setDrawColor(200,200,200); doc.setLineWidth(0.15)
    doc.rect(ML, y, TW, rH)
    ;[cols.rubX, cols.baseX, cols.tauxX, cols.retX, cols.gainX, MR].forEach(x => {
      doc.line(x, y, x, y + rH)
    })
    doc.setTextColor(...C_BLACK)
    doc.text(rub.label, cols.rubX + 1, y + 3.5)
    doc.text(fmt(rub.base), cols.baseX + cols.baseW, y + 3.5, { align: 'right' })
    doc.text('30', cols.tauxX + cols.tauxW, y + 3.5, { align: 'right' })
    if (rub.base > 0) doc.text(fmt(rub.base), cols.gainX + cols.gainW, y + 3.5, { align: 'right' })
    y += rH
  }

  // ── Salaire brut — texte rouge ─────────────────────────────────────────────
  doc.setDrawColor(160,160,160); doc.setLineWidth(0.25)
  doc.rect(ML, y, TW, rH)
  ;[cols.rubX, cols.baseX, cols.tauxX, cols.retX, cols.gainX, MR].forEach(x => {
    doc.line(x, y, x, y + rH)
  })
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...C_RED)
  doc.text('Salaire brut', cols.rubX + 1, y + 3.7)
  doc.setTextColor(...C_BLACK)
  doc.text(fmt(result.gross_salary), cols.gainX + cols.gainW, y + 3.7, { align: 'right' })
  y += rH

  // ── CNSS / AMU / IRPP ─────────────────────────────────────────────────────
  const cotisations = [
    { label: 'CNSS',  base: result.gross_salary, taux: '0,04', ret: result.cnss_employee },
    { label: 'AMU',   base: result.gross_salary, taux: '0,05', ret: result.amu_employee  },
    { label: 'IRPP',  base: result.taxable_income_monthly || 0, taux: '', ret: result.irpp_net },
  ]
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...C_BLACK)
  for (const cot of cotisations) {
    doc.setDrawColor(200,200,200); doc.setLineWidth(0.15)
    doc.rect(ML, y, TW, rH)
    ;[cols.rubX, cols.baseX, cols.tauxX, cols.retX, cols.gainX, MR].forEach(x => {
      doc.line(x, y, x, y + rH)
    })
    doc.setFont('helvetica', 'bold')
    doc.text(cot.label, cols.rubX + 1, y + 3.5)
    doc.setFont('helvetica', 'normal')
    if (cot.base) doc.text(fmt(cot.base), cols.baseX + cols.baseW, y + 3.5, { align: 'right' })
    if (cot.taux) doc.text(cot.taux,      cols.tauxX + cols.tauxW, y + 3.5, { align: 'right' })
    if (cot.ret)  doc.text(fmt(cot.ret),  cols.retX  + cols.retW,  y + 3.5, { align: 'right' })
    y += rH
  }

  // ── Total Retenues Légales ─────────────────────────────────────────────────
  doc.setDrawColor(160,160,160); doc.setLineWidth(0.25)
  doc.rect(ML, y, TW, rH)
  ;[cols.rubX, cols.baseX, cols.tauxX, cols.retX, cols.gainX, MR].forEach(x => {
    doc.line(x, y, x, y + rH)
  })
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...C_BLACK)
  doc.text('Total Retenues Légales', cols.rubX + 1, y + 3.7)
  doc.text(fmt(result.cnss_employee + result.amu_employee + result.irpp_net), cols.retX + cols.retW, y + 3.7, { align: 'right' })
  y += rH

  // ── Salaire Net légal ──────────────────────────────────────────────────────
  const netLegal = result.gross_salary - result.cnss_employee - result.amu_employee - result.irpp_net
  doc.rect(ML, y, TW, rH)
  ;[cols.rubX, cols.baseX, cols.tauxX, cols.retX, cols.gainX, MR].forEach(x => {
    doc.line(x, y, x, y + rH)
  })
  doc.setFont('helvetica', 'bold')
  doc.text('Salaire Net ', cols.rubX + 1, y + 3.7)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5)
  doc.text('(après Retenues Légales)', cols.rubX + 24, y + 3.7)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5)
  doc.text(fmt(netLegal), cols.gainX + cols.gainW, y + 3.7, { align: 'right' })
  y += rH

  // ── Retenue avance ─────────────────────────────────────────────────────────
  const advance = variables.salary_advance || 0
  doc.setDrawColor(200,200,200); doc.setLineWidth(0.15)
  doc.rect(ML, y, TW, rH)
  ;[cols.rubX, cols.baseX, cols.tauxX, cols.retX, cols.gainX, MR].forEach(x => {
    doc.line(x, y, x, y + rH)
  })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
  doc.text('Retenue avance sur salaire', cols.rubX + 1, y + 3.5)
  if (advance > 0) doc.text(fmt(advance), cols.retX + cols.retW, y + 3.5, { align: 'right' })
  y += rH

  // ── Total Autres retenues ──────────────────────────────────────────────────
  doc.setDrawColor(160,160,160); doc.setLineWidth(0.25)
  doc.rect(ML, y, TW, rH)
  ;[cols.rubX, cols.baseX, cols.tauxX, cols.retX, cols.gainX, MR].forEach(x => {
    doc.line(x, y, x, y + rH)
  })
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5)
  doc.text('Total Autres retenues', cols.rubX + 1, y + 3.7)
  if (advance > 0) doc.text(fmt(advance), cols.retX + cols.retW, y + 3.7, { align: 'right' })
  y += rH

  // ── NET A PAYER — fond bleu clair ──────────────────────────────────────────
  doc.setFillColor(...C_BLUE)
  doc.rect(ML, y, TW, 7, 'F')
  doc.setDrawColor(120,120,120); doc.setLineWidth(0.5)
  doc.rect(ML, y, TW, 7)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...C_BLACK)
  doc.text('NET A PAYER', W / 2, y + 5, { align: 'center' })
  doc.text(fmt(result.net_payable), MR, y + 5, { align: 'right' })
  y += 7 + 6

  // ── Signatures + Charges patronales ───────────────────────────────────────
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...C_BLACK)
  doc.text("Signature et Cachet de l'employeur", ML, y)

  // Tableau charges (droite)
  const cpX = 135; const cpLW = 28; const cpVW = 22
  const cpRows = [
    { label: 'Charges\nPatronales',  val: result.cnss_employer },
    { label: 'AMU Part\nPatronale',  val: result.amu_employer  },
    { label: 'Masse\nSalariale',     val: result.gross_salary + result.cnss_employer + result.amu_employer },
  ]
  let cy = y - 2
  for (const row of cpRows) {
    doc.setDrawColor(150,150,150); doc.setLineWidth(0.2)
    doc.rect(cpX, cy, cpLW, 9); doc.rect(cpX + cpLW, cy, cpVW, 9)
    doc.setFont('helvetica', 'bolditalic'); doc.setFontSize(7); doc.setTextColor(...C_BLACK)
    const lines = row.label.split('\n')
    doc.text(lines[0], cpX + 1, cy + 3.5)
    if (lines[1]) doc.text(lines[1], cpX + 1, cy + 7)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
    doc.text(fmt(row.val), cpX + cpLW + cpVW - 1, cy + 5.5, { align: 'right' })
    cy += 9
  }

  cy += 4
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5)
  doc.text("Signature de l'employé(e)", cpX + (cpLW + cpVW) / 2, cy, { align: 'center' })

  // Pied de page
  doc.setFont('helvetica', 'italic'); doc.setFontSize(6.5); doc.setTextColor(140,140,140)
  doc.text(`Édité le ${new Date().toLocaleDateString('fr-FR')} · ElomPaie · CGI OTR 2025`, W / 2, 290, { align: 'center' })

  if (!returnDoc) {
    doc.save(`bulletin_${employee.last_name}_${monthName}_${period.period_year}.pdf`)
  }
  return doc
}

// ── Attestation de travail ─────────────────────────────────────────────────────
export function generateAttestationTravailPDF(employee: any, orgName: string) {
  const doc = new jsPDF(); const pw = doc.internal.pageSize.getWidth()
  doc.setFillColor(37, 99, 235); doc.rect(0, 0, pw, 18, 'F')
  doc.setTextColor(255,255,255); doc.setFontSize(13); doc.setFont('helvetica', 'bold')
  doc.text('ATTESTATION DE TRAVAIL', pw / 2, 12, { align: 'center' })
  doc.setTextColor(0,0,0); doc.setFontSize(10); doc.setFont('helvetica', 'normal')
  let y = 35
  doc.text(`Je soussigné(e), représentant légal de ${orgName},`, 20, y); y += 8
  doc.text('certifie que :', 20, y); y += 12
  doc.setFont('helvetica', 'bold')
  doc.text(`M./Mme ${employee.first_name} ${employee.last_name}`, 20, y); y += 8
  doc.setFont('helvetica', 'normal')
  if (employee.matricule) { doc.text(`Matricule : ${employee.matricule}`, 20, y); y += 7 }
  doc.text(`Poste : ${employee.position || '—'}`, 20, y); y += 7
  doc.text(`Catégorie : ${employee.category || '—'}`, 20, y); y += 7
  if (employee.hire_date) { doc.text(`est employé(e) dans notre entreprise depuis le ${new Date(employee.hire_date).toLocaleDateString('fr-FR')}.`, 20, y); y += 7 }
  y += 10
  doc.text("Cette attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.", 20, y); y += 15
  doc.text(`Lomé, le ${new Date().toLocaleDateString('fr-FR')}`, 20, y); y += 20
  doc.text('Signature et cachet :', pw - 80, y); y += 20
  doc.line(pw - 80, y, pw - 20, y)
  doc.save(`attestation_travail_${employee.last_name}.pdf`)
}

// ── Attestation de salaire ─────────────────────────────────────────────────────
export function generateAttestationSalairePDF(employee: any, result: PayrollResult, period: any, orgName: string) {
  const doc = new jsPDF(); const pw = doc.internal.pageSize.getWidth()
  const monthName = MONTH_NAMES[period.period_month - 1]
  doc.setFillColor(37, 99, 235); doc.rect(0, 0, pw, 18, 'F')
  doc.setTextColor(255,255,255); doc.setFontSize(13); doc.setFont('helvetica', 'bold')
  doc.text('ATTESTATION DE SALAIRE', pw / 2, 12, { align: 'center' })
  doc.setTextColor(0,0,0); doc.setFontSize(10); doc.setFont('helvetica', 'normal')
  let y = 35
  doc.text(`Je soussigné(e), représentant légal de ${orgName}, certifie que :`, 20, y); y += 12
  doc.setFont('helvetica', 'bold')
  doc.text(`M./Mme ${employee.first_name} ${employee.last_name}`, 20, y); y += 8
  doc.setFont('helvetica', 'normal')
  doc.text(`Poste : ${employee.position || '—'} · Catégorie : ${employee.category || '—'}`, 20, y); y += 7
  doc.text(`perçoit pour la période de ${monthName} ${period.period_year} :`, 20, y); y += 12
  autoTable(doc, { startY: y, body: [['Salaire brut', formatXOF(result.gross_salary)], ['Total retenues', formatXOF(result.total_deductions)], ['Net à payer', formatXOF(result.net_payable)]], theme: 'grid', bodyStyles: { fontSize: 10 }, columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } } })
  y = (doc as any).lastAutoTable.finalY + 15
  doc.text(`Lomé, le ${new Date().toLocaleDateString('fr-FR')}`, 20, y); y += 20
  doc.text('Signature et cachet :', pw - 80, y); y += 20
  doc.line(pw - 80, y, pw - 20, y)
  doc.save(`attestation_salaire_${employee.last_name}_${monthName}${period.period_year}.pdf`)
}

// ── Bordereau CNSS ─────────────────────────────────────────────────────────────
export function generateBordereauCNSS(period: any, variables: any[], orgName: string) {
  const doc = new jsPDF('landscape'); const pw = doc.internal.pageSize.getWidth()
  const monthName = MONTH_NAMES[period.period_month - 1]
  doc.setFillColor(37, 99, 235); doc.rect(0, 0, pw, 18, 'F')
  doc.setTextColor(255,255,255); doc.setFontSize(12); doc.setFont('helvetica', 'bold')
  doc.text('BORDEREAU DE DÉCLARATION CNSS', pw / 2, 12, { align: 'center' })
  doc.setTextColor(0,0,0); doc.setFontSize(9); doc.setFont('helvetica', 'normal')
  doc.text(`Employeur: ${orgName}   |   Période: ${monthName} ${period.period_year}   |   Client: ${period.clients?.name || ''}`, 14, 25)
  const rows = variables.map(v => [v.employees?.matricule || '—', `${v.employees?.first_name || ''} ${v.employees?.last_name || ''}`, formatXOF(v.gross_salary), formatXOF(v.cnss_employee), formatXOF(v.cnss_employer), formatXOF(v.cnss_employee + v.cnss_employer)])
  const totals = ['', 'TOTAL', formatXOF(variables.reduce((s, v) => s + v.gross_salary, 0)), formatXOF(variables.reduce((s, v) => s + v.cnss_employee, 0)), formatXOF(variables.reduce((s, v) => s + v.cnss_employer, 0)), formatXOF(variables.reduce((s, v) => s + v.cnss_employee + v.cnss_employer, 0))]
  autoTable(doc, { startY: 32, head: [['Matricule', 'Nom & Prénom', 'Salaire brut', 'CNSS salarié (4%)', 'CNSS patron (17,5%)', 'Total CNSS']], body: [...rows, totals], theme: 'striped', headStyles: { fillColor: [37, 99, 235], fontSize: 8 }, bodyStyles: { fontSize: 8 }, columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } } })
  doc.save(`bordereau_CNSS_${monthName}${period.period_year}.pdf`)
}

// ── Bordereau AMU ──────────────────────────────────────────────────────────────
export function generateBordereauAMU(period: any, variables: any[], orgName: string) {
  const doc = new jsPDF('landscape'); const pw = doc.internal.pageSize.getWidth()
  const monthName = MONTH_NAMES[period.period_month - 1]
  doc.setFillColor(16, 185, 129); doc.rect(0, 0, pw, 18, 'F')
  doc.setTextColor(255,255,255); doc.setFontSize(12); doc.setFont('helvetica', 'bold')
  doc.text('BORDEREAU DE DÉCLARATION AMU', pw / 2, 12, { align: 'center' })
  doc.setTextColor(0,0,0); doc.setFontSize(9); doc.setFont('helvetica', 'normal')
  doc.text(`Employeur: ${orgName}   |   Période: ${monthName} ${period.period_year}   |   Client: ${period.clients?.name || ''}`, 14, 25)
  const rows = variables.map(v => [v.employees?.matricule || '—', `${v.employees?.first_name || ''} ${v.employees?.last_name || ''}`, formatXOF(v.gross_salary), formatXOF(v.amu_employee), formatXOF(v.amu_employer), formatXOF(v.amu_employee + v.amu_employer)])
  const totals = ['', 'TOTAL', formatXOF(variables.reduce((s, v) => s + v.gross_salary, 0)), formatXOF(variables.reduce((s, v) => s + v.amu_employee, 0)), formatXOF(variables.reduce((s, v) => s + v.amu_employer, 0)), formatXOF(variables.reduce((s, v) => s + v.amu_employee + v.amu_employer, 0))]
  autoTable(doc, { startY: 32, head: [['Matricule', 'Nom & Prénom', 'Salaire brut', 'AMU salarié (5%)', 'AMU patron (5%)', 'Total AMU']], body: [...rows, totals], theme: 'striped', headStyles: { fillColor: [16, 185, 129], fontSize: 8 }, bodyStyles: { fontSize: 8 }, columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } } })
  doc.save(`bordereau_AMU_${monthName}${period.period_year}.pdf`)
}

// ── Déclaration IRPP ───────────────────────────────────────────────────────────
export function generateDeclarationIRPP(periods: any[], variables: any[], orgName: string, quarter: number, year: number) {
  const doc = new jsPDF('landscape'); const pw = doc.internal.pageSize.getWidth()
  doc.setFillColor(124, 58, 237); doc.rect(0, 0, pw, 18, 'F')
  doc.setTextColor(255,255,255); doc.setFontSize(12); doc.setFont('helvetica', 'bold')
  doc.text(`DÉCLARATION IRPP TRIMESTRIELLE — T${quarter} ${year}`, pw / 2, 12, { align: 'center' })
  doc.setTextColor(0,0,0); doc.setFontSize(9)
  doc.text(`Employeur: ${orgName}`, 14, 25)
  const rows = variables.map(v => [v.employees?.matricule || '—', `${v.employees?.first_name || ''} ${v.employees?.last_name || ''}`, MONTH_NAMES[(v.period_month || 1) - 1], formatXOF(v.gross_salary), formatXOF(v.taxable_income), formatXOF(v.irpp_net)])
  autoTable(doc, { startY: 32, head: [['Matricule', 'Salarié', 'Mois', 'Salaire brut', 'Revenu imposable', 'IRPP']], body: [...rows, ['', '', 'TOTAL', '', '', formatXOF(variables.reduce((s, v) => s + (v.irpp_net || 0), 0))]], theme: 'striped', headStyles: { fillColor: [124, 58, 237], fontSize: 8 }, bodyStyles: { fontSize: 8 }, columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } } })
  doc.save(`declaration_IRPP_T${quarter}_${year}.pdf`)
}

// ── Archivage PDF ──────────────────────────────────────────────────────────────
export async function uploadBulletinToStorage(pdfDoc: jsPDF, _employeeId: string, periodLabel: string, _orgId: string): Promise<{ url: string | null; error: string | null }> {
  try {
    const pdfArrayBuffer = pdfDoc.output('arraybuffer')
    const filename = `${periodLabel.replace(/\s/g, '-')}.pdf`
    const res = await fetch('/api/upload-logo', {
      method: 'POST', credentials: 'include',
      headers: { 'x-content-type': 'application/pdf', 'x-filename': filename },
      body: pdfArrayBuffer,
    })
    const data = await res.json()
    if (!res.ok) return { url: null, error: data.error }
    return { url: data.url, error: null }
  } catch (e: any) {
    return { url: null, error: e.message }
  }
}

// ── PDF → Image PNG ────────────────────────────────────────────────────────────
export async function pdfToImagePng(doc: jsPDF, filename: string, scale = 2): Promise<void> {
  // Exporter le PDF en ArrayBuffer
  const pdfBuffer = doc.output('arraybuffer')
  const pdfBlob   = new Blob([pdfBuffer], { type: 'application/pdf' })
  const pdfUrl    = URL.createObjectURL(pdfBlob)

  // Charger pdfjs dynamiquement
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
  ).toString()

  const pdfDoc2 = await pdfjsLib.getDocument({ url: pdfUrl }).promise
  const images: string[] = []

  for (let i = 1; i <= pdfDoc2.numPages; i++) {
    const page     = await pdfDoc2.getPage(i)
    const viewport = page.getViewport({ scale })
    const canvas   = document.createElement('canvas')
    canvas.width   = viewport.width
    canvas.height  = viewport.height
    const ctx = canvas.getContext('2d')!
    await page.render({ canvasContext: ctx, viewport, canvas }).promise
    images.push(canvas.toDataURL('image/png'))
  }

  URL.revokeObjectURL(pdfUrl)

  if (images.length === 1) {
    // Une seule page → PNG direct
    const a = document.createElement('a')
    a.href     = images[0]
    a.download = filename
    a.click()
  } else {
    // Plusieurs pages → PNG par page
    images.forEach((img, idx) => {
      const a = document.createElement('a')
      a.href     = img
      a.download = filename.replace('.png', `_page${idx + 1}.png`)
      a.click()
    })
  }
}

// Wrapper: générer bulletin puis exporter en format demandé
export async function exportBulletin(
  data: BulletinData,
  format: 'pdf' | 'png' | 'xlsx'
): Promise<void> {
  if (format === 'xlsx') {
    // fallback — xlsx géré côté serveur via /api/export-bulletin
    return
  }
  const doc = await generateBulletinPDF({ ...data, returnDoc: true })
  const name = `Bulletin_${data.employee.last_name || 'employe'}_${
    (data.period as any).period_year || ''
  }`
  if (format === 'pdf') {
    doc.save(`${name}.pdf`)
  } else {
    await pdfToImagePng(doc, `${name}.png`)
  }
}
