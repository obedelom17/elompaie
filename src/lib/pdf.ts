import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatXOF, MONTH_NAMES, PayrollResult } from './payroll'

interface BulletinData {
  employee: {
    first_name: string; last_name: string; matricule: string | null
    position: string | null; category: string | null
    marital_status: string; children_count: number
    clients?: { name: string } | null
  }
  period: { period_month: number; period_year: number; clients?: { name: string } | null }
  variables: any
  result: PayrollResult
  orgName: string
}

export function generateBulletinPDF(data: BulletinData) {
  const { employee, period, variables, result, orgName } = data
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const monthName = MONTH_NAMES[period.period_month - 1]

  // En-tête
  doc.setFillColor(37, 99, 235)
  doc.rect(0, 0, pageWidth, 16, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('BULLETIN DE PAIE', pageWidth / 2, 11, { align: 'center' })
  doc.setTextColor(0, 0, 0)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Période : ${monthName} ${period.period_year}`, pageWidth / 2, 23, { align: 'center' })

  // Employeur / Salarié
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('EMPLOYEUR', 14, 33)
  doc.setFont('helvetica', 'normal')
  doc.text(orgName, 14, 39)
  doc.text(period.clients?.name || '', 14, 44)

  doc.setFont('helvetica', 'bold')
  doc.text('SALARIÉ', pageWidth - 14, 33, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.text(`${employee.first_name} ${employee.last_name}`, pageWidth - 14, 39, { align: 'right' })
  if (employee.matricule) doc.text(`Matricule : ${employee.matricule}`, pageWidth - 14, 44, { align: 'right' })
  if (employee.position) doc.text(`Poste : ${employee.position}`, pageWidth - 14, 49, { align: 'right' })
  doc.text(`Situation : ${employee.marital_status} — ${employee.children_count} enfant(s)`, pageWidth - 14, 54, { align: 'right' })

  // Éléments de rémunération
  const rows: [string, string][] = []
  const addRow = (label: string, val: number) => { if (val > 0) rows.push([label, formatXOF(val)]) }
  addRow('Salaire de base', variables.base_salary)
  addRow('Sursalaire', variables.overtime_premium)
  addRow('Indemnité de grossesse', variables.pregnancy_allowance)
  addRow('Indemnité de fonction', variables.function_allowance)
  addRow('Indemnité de communication', variables.communication_allowance)
  addRow('Prime de logement', variables.housing_premium)
  addRow('Prime de repas', variables.meal_premium)
  addRow('Indemnité de transport', variables.transport_allowance)

  autoTable(doc, {
    startY: 62,
    head: [['ÉLÉMENTS DE RÉMUNÉRATION', 'MONTANT']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right' } },
  })

  let y: number = (doc as any).lastAutoTable.finalY + 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('SALAIRE BRUT', 14, y)
  doc.text(formatXOF(result.gross_salary), pageWidth - 14, y, { align: 'right' })

  // Retenues
  const retenues: [string, string][] = [
    ['CNSS salarié (4%)', formatXOF(result.cnss_employee)],
    ['INAM salarié (5%)', formatXOF(result.inam_employee)],
    [`Abattement 28% (Art. 26 CGI)`, `- ${formatXOF(result.abattement_28)}`],
    [`Déduction charges famille (${employee.children_count} enf. + conj.)`, `- ${formatXOF(result.charges_famille)}`],
    [`Revenu imposable mensuel`, formatXOF(result.taxable_income_monthly)],
    ['ITS (barème Art. 74 CGI 2025)', formatXOF(result.its_net)],
  ]
  if (variables.salary_advance > 0) retenues.push(['Avance sur salaire', formatXOF(variables.salary_advance)])
  if (variables.loan_payment > 0) retenues.push(['Remboursement prêt', formatXOF(variables.loan_payment)])

  autoTable(doc, {
    startY: y + 6,
    head: [['COTISATIONS ET RETENUES', 'MONTANT']],
    body: retenues,
    theme: 'striped',
    headStyles: { fillColor: [220, 38, 38], fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right' } },
  })

  y = (doc as any).lastAutoTable.finalY + 4
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL RETENUES', 14, y)
  doc.text(formatXOF(result.total_deductions), pageWidth - 14, y, { align: 'right' })

  // Net à payer (bandeau)
  y += 10
  doc.setFillColor(37, 99, 235)
  doc.rect(14, y - 6, pageWidth - 28, 14, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.text('NET À PAYER', 18, y + 2)
  doc.text(formatXOF(result.net_payable), pageWidth - 18, y + 2, { align: 'right' })

  // Charges patronales
  doc.setTextColor(0, 0, 0)
  y += 20
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('CHARGES PATRONALES (non déduites du salaire)', 14, y)
  doc.setFont('helvetica', 'normal')
  y += 5
  doc.text(`CNSS employeur (17,5%) : ${formatXOF(result.cnss_employer)}`, 14, y)
  y += 5
  doc.text(`INAM employeur (5%) : ${formatXOF(result.inam_employer)}`, 14, y)
  y += 5
  doc.setFont('helvetica', 'bold')
  doc.text(`Total charges patronales : ${formatXOF(result.employer_total)}`, 14, y)

  // Coût total employeur
  y += 5
  doc.text(`Coût total employeur : ${formatXOF(result.gross_salary + result.employer_total)}`, 14, y)

  // Pied de page
  y += 14
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(100, 100, 100)
  doc.text(
    'Conforme au Code du Travail Togo 2021 & Code Général des Impôts OTR 2025 (Barème ITS Art. 74 — Abattement 28% Art. 26 — Charges famille Art. 73)',
    pageWidth / 2, y, { align: 'center' }
  )
  y += 4
  doc.text(`Édité le ${new Date().toLocaleDateString('fr-FR')} par ${orgName}`, pageWidth / 2, y, { align: 'center' })

  doc.save(`bulletin_${employee.last_name}_${monthName}_${period.period_year}.pdf`)
}
