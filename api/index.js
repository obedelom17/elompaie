export const config = {
  runtime: 'nodejs',
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

import { requireAuth } from './_auth.js'
import { sql } from './_db.js'
import { neon } from '@neondatabase/serverless'
import { calcIrppMensuel, calcBrut, calcPersonnesCharge } from './_payroll.js'
import { put } from '@vercel/blob'
import ExcelJS from 'exceljs'

const NEON_AUTH_BASE_URL = process.env.NEON_AUTH_BASE_URL
const DB_URL = () => process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL

// ─── SESSION HELPER ───────────────────────────────────────────────────────────
async function getSession(cookieHeader) {
  if (!NEON_AUTH_BASE_URL) throw new Error('NEON_AUTH_BASE_URL non configuré')
  if (!cookieHeader) return null
  const r = await fetch(`${NEON_AUTH_BASE_URL}/get-session`, {
    headers: { cookie: cookieHeader },
    signal: AbortSignal.timeout(8000),
  })
  if (!r.ok) return null
  const s = await r.json()
  return s?.user?.id ? s : null
}

// ─── INIT TABLES (idempotent) ─────────────────────────────────────────────────
async function initTables(db) {
  try {
    await db`CREATE TABLE IF NOT EXISTS organizations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`
    await db`CREATE TABLE IF NOT EXISTS user_profiles (
      user_id TEXT PRIMARY KEY,
      organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`
  } catch {}
}

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────
async function authMe(req, res) {
  try {
    const session = await getSession(req.headers?.cookie || '')
    if (!session) return res.status(401).json({ error: 'Non authentifié' })
    const db = neon(DB_URL())
    await initTables(db)
    let org = null
    try {
      const rows = await db`
        SELECT up.organization_id, o.name as org_name
        FROM user_profiles up
        LEFT JOIN organizations o ON o.id = up.organization_id
        WHERE up.user_id = ${session.user.id}
      `
      if (rows[0]?.organization_id) org = { id: rows[0].organization_id.toString(), name: rows[0].org_name }
    } catch { /* ignore */ }
    return res.status(200).json({ userId: session.user.id, email: session.user.email, org })
  } catch (e) {
    // silent
    return res.status(500).json({ error: e.message })
  }
}

async function authRepairOrg(req, res) {
  try {
    const session = await getSession(req.headers?.cookie || '')
    if (!session) return res.status(401).json({ error: 'Non authentifié' })
    const userId = session.user.id
    const orgName = (req.body?.orgName || session.user?.email?.split('@')[0] || 'Cabinet').trim()
    const db = neon(DB_URL())
    await initTables(db)
    const existing = await db`
      SELECT up.organization_id, o.name
      FROM user_profiles up
      LEFT JOIN organizations o ON o.id = up.organization_id
      WHERE up.user_id = ${userId}
    `
    if (existing.length && existing[0].organization_id) {
      return res.status(200).json({ ok: true, org: { id: existing[0].organization_id.toString(), name: existing[0].name }, already: true })
    }
    const orgs = await db`INSERT INTO organizations (name) VALUES (${orgName}) RETURNING id::text, name`
    const org = orgs[0]
    await db`INSERT INTO user_profiles (user_id, organization_id) VALUES (${userId}, ${org.id}::uuid)
             ON CONFLICT (user_id) DO UPDATE SET organization_id = ${org.id}::uuid`
    return res.status(200).json({ ok: true, org })
  } catch (e) {
    // silent
    return res.status(500).json({ error: e.message })
  }
}

async function authSignupOrg(req, res) {
  try {
    const auth = await requireAuth(req)
    const orgName = (req.body?.orgName || '').trim()
    if (!orgName) return res.status(400).json({ error: 'orgName requis' })
    const db = neon(DB_URL())
    await initTables(db)
    if (auth.orgId) {
      const orgs = await db`SELECT id::text, name FROM organizations WHERE id::text = ${auth.orgId}`
      if (orgs.length) return res.status(200).json({ ok: true, org: { id: orgs[0].id, name: orgs[0].name } })
    }
    const orgs = await db`INSERT INTO organizations (name) VALUES (${orgName}) RETURNING id::text, name`
    const org = orgs[0]
    await db`INSERT INTO user_profiles (user_id, organization_id) VALUES (${auth.userId}, ${org.id}::uuid)
             ON CONFLICT (user_id) DO UPDATE SET organization_id = ${org.id}::uuid`
    return res.status(200).json({ ok: true, org })
  } catch (e) {
    const status = e.message.includes('auth') || e.message.includes('authentif') || e.message.includes('Session') ? 401 : 500
    return res.status(status).json({ error: e.message })
  }
}

async function authDebug(req, res) {
  const info = {
    env: {
      NEON_AUTH_BASE_URL: NEON_AUTH_BASE_URL ? '✓ défini' : '✗ MANQUANT',
      DATABASE_URL: process.env.DATABASE_URL ? '✓' : '✗',
      POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL ? '✓' : '✗',
    },
    cookie: req.headers?.cookie ? req.headers.cookie.substring(0, 150) + '...' : 'AUCUN COOKIE',
    session: null, userProfile: null, error: null, sessionStatus: null,
  }
  try {
    const session = await getSession(req.headers?.cookie || '')
    info.session = session?.user ? { id: session.user.id, email: session.user.email } : null
    if (session?.user?.id) {
      const db = neon(DB_URL())
      await initTables(db)
      const rows = await db`
        SELECT up.user_id, up.organization_id::text, o.name as org_name
        FROM user_profiles up
        LEFT JOIN organizations o ON o.id = up.organization_id
        WHERE up.user_id = ${session.user.id}
      `
      info.userProfile = rows[0] || 'AUCUN PROFIL (user_profiles vide)'
    }
  } catch (e) { info.error = e.message }
  return res.status(200).json(info)
}

// ─── EXCEL HELPERS ────────────────────────────────────────────────────────────
const thin  = () => ({ style: 'thin' })
const dbl   = () => ({ style: 'double' })
const med   = () => ({ style: 'medium' })
const cg    = (sz=10,bold=false,italic=false) => ({ name:'Century Gothic', size:sz, bold, italic })
const cal   = (sz=11,bold=false)  => ({ name:'Calibri', size:sz, bold })
const bos   = (sz=10,bold=false)  => ({ name:'Bookman Old Style', size:sz, bold })
const aln   = (h,v='center',wrap=false) => ({ horizontal:h, vertical:v, wrapText:wrap })

function sc(ws, addr, val, font, align, border, numFmt) {
  const c = ws.getCell(addr)
  c.value = val
  if (font)   c.font      = font
  if (align)  c.alignment = align
  if (border) c.border    = border
  if (numFmt) c.numFmt    = numFmt
}

// ─── BULLETIN DE PAIE (imitation parfaite DVV_2026.xlsx) ─────────────────────
function genBulletin(wb, sheetName, data) {
  const ws = wb.addWorksheet(sheetName)

  // Largeurs colonnes identiques à l'original (A=Code B=Rubriques C=Base D=Taux E=Retenues F=Gains)
  ws.getColumn(1).width = 6.0      // Code
  ws.getColumn(2).width = 35.0     // Rubriques
  ws.getColumn(3).width = 14.0     // Base
  ws.getColumn(4).width = 9.0      // Taux/NB
  ws.getColumn(5).width = 16.0     // Retenues
  ws.getColumn(6).width = 16.0     // Gains

  ws.pageSetup.orientation = 'portrait'
  ws.pageSetup.paperSize   = 9
  ws.pageSetup.fitToPage   = true
  ws.pageSetup.fitToWidth  = 1
  ws.pageSetup.fitToHeight = 0

  // ── Logo (col A-B, rows 1-9) ──────────────────────────────────────────────
  if (data.logoBuffer && data.logoBuffer.length > 4) {
    try {
      const b = data.logoBuffer
      let extension = 'png'
      if (b[0]===0xFF && b[1]===0xD8) extension = 'jpeg'
      if (extension !== 'gif') {
        const imgId = wb.addImage({ buffer: data.logoBuffer, extension })
        ws.addImage(imgId, { tl:{col:0,row:0}, br:{col:2,row:9} })
      }
    } catch {}
  }

  // ── BULLETIN DE PAIE – box grise D9 centré (col C-F, rows 2-4) ──────────
  ws.mergeCells('C2:F4')
  const bpCell = ws.getCell('C2')
  bpCell.value     = 'BULLETIN DE PAIE'
  bpCell.font      = { name:'Calibri', size:18, bold:true, color:{argb:'FFC00000'} }
  bpCell.alignment = { horizontal:'center', vertical:'center' }
  bpCell.fill      = { type:'pattern', pattern:'solid', fgColor:{argb:'FFD9D9D9'} }

  // ── Ligne rouge (row 5, col C-F) ─────────────────────────────────────────
  ws.mergeCells('C5:F5')
  ws.getCell('C5').fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFC00000'} }
  ws.getRow(5).height = 6

  // ── Période (col C-F, rows 6-9) ──────────────────────────────────────────
  const moisLabel = data.mois_label || ''
  const annee     = data.period_year || ''
  const moisNum   = String(Number(data.period_month)||1).padStart(2,'0')
  const lastDay   = (annee && data.period_month) ? new Date(Number(annee), Number(data.period_month), 0).getDate() : 30
  ws.mergeCells('C6:F9')
  const perCell = ws.getCell('C6')
  perCell.value = {
    richText: [
      { font:{name:'Calibri',size:12,bold:true}, text:`MOIS DE: ${moisLabel}` },
      { font:{name:'Calibri',size:12,bold:true}, text:`\nPERIODE DU:  01/${moisNum}/${annee}` },
      { font:{name:'Calibri',size:12,bold:true}, text:`\n                   AU:  ${lastDay}/${moisNum}/${annee}` },
    ]
  }
  perCell.alignment = { horizontal:'left', vertical:'top', wrapText:true }
  perCell.fill      = { type:'pattern', pattern:'solid', fgColor:{argb:'FFF2F2F2'} }
  perCell.border    = { left:thin(), right:thin(), top:thin(), bottom:thin() }

  // ── Entité – box bleu foncé (row 11-13) ──────────────────────────────────
  ws.mergeCells('A11:F13')
  const entCell = ws.getCell('A11')
  entCell.value     = `Entité: ${data.client_name||''}\n${data.client_adresse||''}`
  entCell.font      = { name:'Calibri', size:14, bold:true, color:{argb:'FFFFFFFF'} }
  entCell.alignment = { horizontal:'center', vertical:'middle', wrapText:true }
  entCell.fill      = { type:'pattern', pattern:'solid', fgColor:{argb:'FF1F3864'} }
  entCell.border    = { left:thin(), right:thin(), top:thin(), bottom:thin() }
  ws.getRow(11).height = 20.25

  // ── N° Employeur / NIF / TEL (rows 15-16) ────────────────────────────────
  ws.mergeCells('A15:F16')
  const numCell = ws.getCell('A15')
  numCell.value     = `N° Employeur : ${data.num_employeur||''}      NIF : ${data.nif||''}\nTEL: ${data.telephone_client||''}`
  numCell.font      = { name:'Calibri', size:14, bold:true, color:{argb:'FFFFFFFF'} }
  numCell.alignment = { horizontal:'center', vertical:'middle', wrapText:true }
  numCell.fill      = { type:'pattern', pattern:'solid', fgColor:{argb:'FF1F3864'} }
  numCell.border    = { left:thin(), right:thin(), top:thin(), bottom:thin() }

  // ── Infos employé (rows 18-25) exactement comme l'original ───────────────
  const infos = [
    ['A18'," Nom & Prénoms : ",'B18', data.nom,              true ],
    ['A19','N°Assuré :',       'B19', data.n_assure,         false],
    ['A20','NIF:',             'B20', data.nif_employe,      false],
    ['A21','Direction/section:','B21',data.direction,        true ],
    ['A22','Poste/Fonction: ', 'B22', data.poste,            true ],
    ['A23','Téléphone:',       'B23', data.telephone,        true ],
    ['A24'," Date d'embauche: ",'B24',data.date_embauche,   false],
    ['A25',' Pers à charge ',  'B25', data.personnes_charge, false],
  ]
  for (const [ca, la, cb, vb, bold] of infos) {
    sc(ws, ca, la, { name:'Calibri', size:10, bold:true }, { horizontal:'right' }, { left:dbl() })
    sc(ws, cb, vb, { name:'Calibri', size:10, bold }, { horizontal:'left' })
  }
  ws.getRow(18).height = 14.25

  // ── En-têtes tableau (row 26) exactement comme l'original ────────────────
  const hLabels = ['Code','Rubriques','Base','Taux/NB','Retenues','Gains']
  const hFill   = { type:'pattern', pattern:'solid', fgColor:{argb:'FFD9E1F2'} }
  for (let i=0; i<6; i++) {
    const col  = String.fromCharCode(65+i)
    const cell = ws.getCell(`${col}26`)
    cell.value     = hLabels[i]
    cell.font      = { name:'Calibri', size:10, bold:true }
    cell.alignment = { horizontal:'center', vertical:'middle' }
    cell.fill      = hFill
    cell.border    = {
      left:  i===0 ? dbl() : thin(),
      right: i===5 ? dbl() : thin(),
      top:thin(), bottom:thin()
    }
  }
  ws.getRow(26).height = 18

  // ── Rubriques dynamiques ──────────────────────────────────────────────────
  let row = 27
  const gainsRows = []
  for (const rub of (data.rubriques || [])) {
    // Code
    ws.getCell(`A${row}`).border = { left:dbl(), right:thin() }
    // Rubrique
    sc(ws, `B${row}`, rub.label, { name:'Calibri', size:10, bold:false }, { horizontal:'left', vertical:'center' }, { left:thin() })
    // Base
    if (rub.base != null) {
      ws.getCell(`C${row}`).value  = rub.base
      ws.getCell(`C${row}`).numFmt = '#,##0'
      ws.getCell(`C${row}`).border = { left:thin() }
      ws.getCell(`C${row}`).font   = { name:'Calibri', size:10 }
    }
    // Taux/NB = 30 comme l'original
    ws.getCell(`D${row}`).value  = rub.taux_ou_nb != null ? rub.taux_ou_nb : 30
    ws.getCell(`D${row}`).border = { left:thin() }
    ws.getCell(`D${row}`).font   = { name:'Calibri', size:10 }
    // Retenues (vide pour gains)
    ws.getCell(`E${row}`).border = { left:thin() }
    // Gains = base (formule)
    ws.getCell(`F${row}`).value  = { formula:`C${row}` }
    ws.getCell(`F${row}`).numFmt = '#,##0'
    ws.getCell(`F${row}`).border = { left:thin(), right:dbl() }
    ws.getCell(`F${row}`).font   = { name:'Calibri', size:10 }
    gainsRows.push(row)
    row++
  }

  // 2 lignes vides avec D=30 (comme l'original)
  for (let i=0; i<2; i++) {
    ws.getCell(`A${row}`).border = { left:dbl(), right:thin() }
    ws.getCell(`B${row}`).border = { left:thin() }
    ws.getCell(`C${row}`).border = { left:thin() }
    ws.getCell(`D${row}`).value  = 30
    ws.getCell(`D${row}`).border = { left:thin() }
    ws.getCell(`D${row}`).font   = { name:'Calibri', size:10 }
    ws.getCell(`E${row}`).border = { left:thin() }
    ws.getCell(`F${row}`).value  = 0
    ws.getCell(`F${row}`).numFmt = '#,##0'
    ws.getCell(`F${row}`).border = { left:thin(), right:dbl() }
    row++
  }

  // ── Salaire brut ─────────────────────────────────────────────────────────
  const brutRow = row
  ws.getCell(`A${brutRow}`).border = { left:dbl(), right:thin() }
  sc(ws, `B${brutRow}`, 'Salaire brut ', { name:'Calibri', size:10, bold:true }, { horizontal:'left' }, { left:thin() })
  ws.getCell(`C${brutRow}`).border = { left:thin() }
  ws.getCell(`D${brutRow}`).border = { left:thin() }
  ws.getCell(`E${brutRow}`).border = { left:thin() }
  const gainsFormula = gainsRows.length ? gainsRows.map(r=>`F${r}`).join('+') : '0'
  ws.getCell(`F${brutRow}`).value  = { formula: `IFERROR(${gainsFormula},0)` }
  ws.getCell(`F${brutRow}`).font   = { name:'Calibri', size:10, bold:true }
  ws.getCell(`F${brutRow}`).numFmt = '#,##0'
  ws.getCell(`F${brutRow}`).border = { left:thin(), right:dbl() }
  row++

  // ── CNSS ─────────────────────────────────────────────────────────────────
  const cnssRow = row
  ws.getCell(`A${row}`).border = { left:dbl(), right:thin() }
  sc(ws, `B${row}`, 'CNSS ', { name:'Calibri', size:10, bold:false }, { horizontal:'left' }, { left:thin() })
  ws.getCell(`C${row}`).value  = { formula:`F${brutRow}` }
  ws.getCell(`C${row}`).numFmt = '#,##0'
  ws.getCell(`C${row}`).border = { left:thin() }
  ws.getCell(`D${row}`).value  = 0.04
  ws.getCell(`D${row}`).numFmt = '0%'
  ws.getCell(`D${row}`).border = { left:thin() }
  ws.getCell(`E${row}`).value  = { formula:`C${row}*D${row}` }
  ws.getCell(`E${row}`).numFmt = '#,##0'
  ws.getCell(`E${row}`).border = { left:thin() }
  ws.getCell(`F${row}`).border = { left:thin(), right:dbl() }
  row++

  // ── AMU ──────────────────────────────────────────────────────────────────
  const amuRow = row
  ws.getCell(`A${row}`).border = { left:dbl(), right:thin() }
  sc(ws, `B${row}`, 'AMU', { name:'Calibri', size:10, bold:false }, { horizontal:'left' }, { left:thin() })
  ws.getCell(`C${row}`).value  = { formula:`F${brutRow}` }
  ws.getCell(`C${row}`).numFmt = '#,##0'
  ws.getCell(`C${row}`).border = { left:thin() }
  ws.getCell(`D${row}`).value  = 0.05
  ws.getCell(`D${row}`).numFmt = '0%'
  ws.getCell(`D${row}`).border = { left:thin() }
  ws.getCell(`E${row}`).value  = { formula:`C${row}*D${row}` }
  ws.getCell(`E${row}`).numFmt = '#,##0'
  ws.getCell(`E${row}`).border = { left:thin() }
  ws.getCell(`F${row}`).border = { left:thin(), right:dbl() }
  row++

  // ── IRPP ─────────────────────────────────────────────────────────────────
  const irppRow = row
  ws.getCell(`A${row}`).border = { left:dbl(), right:thin() }
  sc(ws, `B${row}`, 'IRPP ', { name:'Calibri', size:10, bold:false }, { horizontal:'left' }, { left:thin() })
  // Base IRPP = brut_imposable (F*0.91 arrondi à 1000)
  ws.getCell(`C${row}`).value  = data.irpp_base || { formula:`FLOOR(F${brutRow}*0.91,1000)` }
  ws.getCell(`C${row}`).numFmt = '#,##0'
  ws.getCell(`C${row}`).border = { left:thin() }
  ws.getCell(`D${row}`).value  = 0
  ws.getCell(`D${row}`).border = { left:thin() }
  ws.getCell(`E${row}`).value  = data.irpp || 0
  ws.getCell(`E${row}`).numFmt = '#,##0'
  ws.getCell(`E${row}`).border = { left:thin() }
  ws.getCell(`F${row}`).border = { left:thin(), right:dbl() }
  row++

  // ── Total Retenues Légales ────────────────────────────────────────────────
  const totRetRow = row
  const totFill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFD9D9D9'} }
  ws.getCell(`A${row}`).border = { left:dbl(), right:thin() }
  sc(ws, `B${row}`, 'Total Retenues Légales', { name:'Calibri', size:10, bold:true }, { horizontal:'left' }, { left:thin() })
  ws.getCell(`B${row}`).fill  = totFill
  ws.getCell(`C${row}`).border = { left:thin() }; ws.getCell(`C${row}`).fill=totFill
  ws.getCell(`D${row}`).border = { left:thin() }; ws.getCell(`D${row}`).fill=totFill
  ws.getCell(`E${row}`).value  = { formula:`E${cnssRow}+E${amuRow}+E${irppRow}` }
  ws.getCell(`E${row}`).font   = { name:'Calibri', size:10, bold:true }
  ws.getCell(`E${row}`).numFmt = '#,##0'
  ws.getCell(`E${row}`).border = { left:thin(), top:thin(), bottom:thin() }
  ws.getCell(`E${row}`).fill   = totFill
  ws.getCell(`F${row}`).border = { left:thin(), right:dbl() }; ws.getCell(`F${row}`).fill=totFill
  row++

  // ── Salaire Net légal ─────────────────────────────────────────────────────
  const netLegalRow = row
  ws.getCell(`A${row}`).border = { left:dbl(), right:thin() }
  sc(ws, `B${row}`, 'Salaire Net (après Retenues Légales)', { name:'Calibri', size:10, bold:true }, { horizontal:'left' }, { left:thin() })
  ws.getCell(`C${row}`).border = { left:thin() }
  ws.getCell(`D${row}`).border = { left:thin() }
  ws.getCell(`E${row}`).border = { left:thin() }
  ws.getCell(`F${row}`).value  = { formula:`F${brutRow}-E${totRetRow}` }
  ws.getCell(`F${row}`).font   = { name:'Calibri', size:10, bold:true }
  ws.getCell(`F${row}`).numFmt = '#,##0'
  ws.getCell(`F${row}`).border = { left:thin(), right:dbl() }
  row++

  // ── Retenue avance ────────────────────────────────────────────────────────
  const avRow = row
  ws.getCell(`A${row}`).border = { left:dbl(), right:thin() }
  sc(ws, `B${row}`, 'Retenue avance sur salaire', { name:'Calibri', size:10, bold:false }, { horizontal:'left' }, { left:thin() })
  ws.getCell(`C${row}`).border = { left:thin() }
  ws.getCell(`D${row}`).border = { left:thin() }
  ws.getCell(`E${row}`).value  = data.avance_salaire || 0
  ws.getCell(`E${row}`).numFmt = '#,##0'
  ws.getCell(`E${row}`).border = { left:thin() }
  ws.getCell(`F${row}`).border = { left:thin(), right:dbl() }
  row++

  // ── Total Autres Retenues ─────────────────────────────────────────────────
  const autRow = row
  ws.getCell(`A${row}`).border = { left:dbl(), right:thin() }
  ws.getCell(`A${row}`).fill   = totFill
  sc(ws, `B${row}`, 'Total Autres retenues', { name:'Calibri', size:10, bold:true }, { horizontal:'left' }, { left:thin() })
  ws.getCell(`B${row}`).fill   = totFill
  ws.getCell(`C${row}`).border = { left:thin() }; ws.getCell(`C${row}`).fill=totFill
  ws.getCell(`D${row}`).border = { left:thin() }; ws.getCell(`D${row}`).fill=totFill
  ws.getCell(`E${row}`).value  = { formula:`E${avRow}` }
  ws.getCell(`E${row}`).font   = { name:'Calibri', size:10, bold:true }
  ws.getCell(`E${row}`).numFmt = '#,##0'
  ws.getCell(`E${row}`).border = { left:thin() }
  ws.getCell(`E${row}`).fill   = totFill
  ws.getCell(`F${row}`).border = { left:thin(), right:dbl() }; ws.getCell(`F${row}`).fill=totFill
  row++

  // ── NET A PAYER ───────────────────────────────────────────────────────────
  const netRow = row
  ws.mergeCells(`A${row}:E${row}`)
  ws.getCell(`A${row}`).value     = 'NET A PAYER '
  ws.getCell(`A${row}`).font      = { name:'Calibri', size:12, bold:true }
  ws.getCell(`A${row}`).alignment = { horizontal:'center', vertical:'middle' }
  ws.getCell(`A${row}`).border    = { left:dbl(), right:thin(), top:thin(), bottom:dbl() }
  ws.getCell(`A${row}`).fill      = { type:'pattern', pattern:'solid', fgColor:{argb:'FFD9E1F2'} }
  ws.getCell(`F${row}`).value     = { formula:`F${netLegalRow}-E${autRow}` }
  ws.getCell(`F${row}`).font      = { name:'Calibri', size:12, bold:true }
  ws.getCell(`F${row}`).numFmt    = '#,##0'
  ws.getCell(`F${row}`).border    = { left:thin(), right:dbl(), top:thin(), bottom:dbl() }
  ws.getCell(`F${row}`).fill      = { type:'pattern', pattern:'solid', fgColor:{argb:'FFD9E1F2'} }
  ws.getRow(row).height = 22
  row += 2

  // ── Charges patronales (bas du bulletin, identique à l'original) ──────────
  const patRow = row
  ws.getRow(row).height = 25.5
  sc(ws, `A${row}`, "Signature et Cachet de l'employeur", { name:'Calibri', size:10, bold:true }, { horizontal:'left', vertical:'center' })
  sc(ws, `E${row}`, 'Charges Patronales', { name:'Calibri', size:8, bold:true, italic:true }, { horizontal:'center', vertical:'center' }, { left:med() })
  ws.getCell(`F${row}`).value     = { formula:`F${brutRow}*17.5%` }
  ws.getCell(`F${row}`).font      = { name:'Calibri', size:10, bold:true }
  ws.getCell(`F${row}`).alignment = { horizontal:'center' }
  ws.getCell(`F${row}`).numFmt    = '#,##0'
  ws.getCell(`F${row}`).border    = { left:med() }
  row++

  ws.getRow(row).height = 25.5
  sc(ws, `E${row}`, 'AMU Part Patronale', { name:'Calibri', size:8, bold:true, italic:true }, { horizontal:'center', vertical:'center' }, { left:med() })
  ws.getCell(`F${row}`).value     = { formula:`E${amuRow}` }
  ws.getCell(`F${row}`).font      = { name:'Calibri', size:10, bold:true }
  ws.getCell(`F${row}`).alignment = { horizontal:'center' }
  ws.getCell(`F${row}`).numFmt    = '#,##0'
  row++

  ws.getRow(row).height = 25.5
  sc(ws, `E${row}`, 'Masse Salariale', { name:'Calibri', size:8, bold:true, italic:true }, { horizontal:'center', vertical:'center' }, { left:med() })
  ws.getCell(`F${row}`).value     = { formula:`F${brutRow}+F${patRow}+E${amuRow}` }
  ws.getCell(`F${row}`).font      = { name:'Calibri', size:9, bold:true }
  ws.getCell(`F${row}`).alignment = { horizontal:'center' }
  ws.getCell(`F${row}`).numFmt    = '#,##0'
  row++

  sc(ws, `D${row}`, "Signature de l'employé(e) ", { name:'Calibri', size:10, bold:true }, { horizontal:'center', vertical:'center' })
}

// ─── ÉTAT DES CHARGES (imitation parfaite Etat_des_charges.xlsx) ──────────────
function genEtatCharges(wb, sheetName, title, employes, avecRegul) {
  const ws = wb.addWorksheet(sheetName)
  const nCols  = avecRegul ? 16 : 14
  const lastCol = avecRegul ? 'P' : 'N'

  // Largeurs identiques à l'original
  const widths = [4.14, 72.57, 20, 42, 17.71, 15.57, 26, 19, 18.86, 26, 22.29, 14.86, 31.86, 15.57, 20, 15.57]
  for (let i = 0; i < nCols; i++) ws.getColumn(i+1).width = widths[i]

  // ── Titre ligne 1 ─────────────────────────────────────────────────────────
  ws.mergeCells(`A1:${lastCol}1`)
  ws.getRow(1).height = 36
  const t = ws.getCell('A1')
  t.value     = title
  t.font      = { name:'Calibri', size:20, bold:false }
  t.alignment = { horizontal:'center', vertical:'middle', wrapText:true }

  // ── Headers ligne 2 ───────────────────────────────────────────────────────
  const headers = avecRegul
    ? ['N°','Nom et Prénoms','Responsable','Poste','Pole','Salaire brut','Salaire brut imposable','CNSS Salarié 4%','AMU Salarié 5%','CNSS Patronale 17,5%','AMU Patronale 5%','IRPP Salarié','REGULARISATION IRPP','IRPP A PAYER','TOTAL RETENUES SALARIES','NET A PAYER']
    : ['N°','Nom et Prénoms','Responsable','Poste','Pole','Salaire brut','Salaire brut imposable','CNSS Salarié 4%','AMU Salarié 5%','CNSS Patronale 17,5%','AMU Patronale 5%','IRPP Salarié','TOTAL RETENUES SALARIES','NET A PAYER']

  const headerFill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFD9E1F2'} }
  for (let ci=1; ci<=headers.length; ci++) {
    const c = ws.getRow(2).getCell(ci)
    c.value     = headers[ci-1]
    c.font      = { name:'Calibri', size:14, bold:false }
    c.alignment = { horizontal:'center', vertical:'middle', wrapText:true }
    c.fill      = headerFill
    c.border    = { left:thin(), right:thin(), top:thin(), bottom:thin() }
  }
  ws.getRow(2).height = 50

  // ── Lignes employés ───────────────────────────────────────────────────────
  for (let i=0; i<employes.length; i++) {
    const r   = i+3
    const emp = employes[i]
    const rowFill = i%2===1 ? { type:'pattern', pattern:'solid', fgColor:{argb:'FFF2F2F2'} } : null

    // Colonnes texte A-E
    const textes = [i+1, emp.nom, emp.responsable||'', emp.poste||'', emp.pole||'']
    const txSizes = [14,15,15,12,12]
    for (let ci=1; ci<=5; ci++) {
      const c = ws.getRow(r).getCell(ci)
      c.value     = textes[ci-1]
      c.font      = { name:'Calibri', size:txSizes[ci-1], bold:false }
      c.alignment = { horizontal: ci===1?'center':'left', vertical:'middle', wrapText:ci===2||ci===3 }
      c.border    = { left:thin(), right:thin(), top:thin(), bottom:thin() }
      if (rowFill) c.fill = rowFill
    }

    // Colonnes numériques: formules identiques à l'original
    // F=brut (N+M ou P+O), G=brut imposable, H=G*4%, I=G*5%, J=G*17.5%, K=G*5%, L=IRPP
    // sans régul: M=H+I+L, N=net_payer
    // avec régul: M=IRPP_salarié, N=regul, O=L+M (IRPP à payer), P=H+I+O, Q=net_payer → décalé
    const vals = avecRegul
      ? [
          [6,  {formula:`P${r}+O${r}`}],
          [7,  emp.brut_imposable],
          [8,  {formula:`G${r}*4%`}],
          [9,  {formula:`G${r}*5%`}],
          [10, {formula:`G${r}*17.5%`}],
          [11, {formula:`G${r}*5%`}],
          [12, emp.irpp],
          [13, emp.regularisation_irpp || 0],
          [14, {formula:`L${r}+M${r}`}],
          [15, {formula:`H${r}+I${r}+N${r}`}],
          [16, emp.net_payer],
        ]
      : [
          [6,  {formula:`N${r}+M${r}`}],
          [7,  emp.brut_imposable],
          [8,  {formula:`G${r}*4%`}],
          [9,  {formula:`G${r}*5%`}],
          [10, {formula:`G${r}*17.5%`}],
          [11, {formula:`G${r}*5%`}],
          [12, emp.irpp],
          [13, {formula:`H${r}+I${r}+L${r}`}],
          [14, emp.net_payer],
        ]

    for (const [ci, val] of vals) {
      const c = ws.getRow(r).getCell(ci)
      c.value     = val
      c.font      = { name:'Calibri', size:14, bold:false }
      c.alignment = { horizontal:'right', vertical:'middle' }
      c.numFmt    = '#,##0'
      c.border    = { left:thin(), right:thin(), top:thin(), bottom:thin() }
      if (rowFill) c.fill = rowFill
    }
    ws.getRow(r).height = 22
  }

  // ── Ligne TOTAL ───────────────────────────────────────────────────────────
  const tr    = employes.length + 3
  const lastR = tr - 1
  const totalFill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF1F3864'} }
  const totalFont = { name:'Calibri', size:13, bold:true, color:{argb:'FFFFFFFF'} }

  ws.getRow(tr).getCell(2).value     = 'TOTAL'
  ws.getRow(tr).getCell(2).font      = totalFont
  ws.getRow(tr).getCell(2).fill      = totalFill
  ws.getRow(tr).getCell(2).alignment = { horizontal:'center', vertical:'middle' }
  ws.getRow(tr).height = 24

  for (let ci=6; ci<=nCols; ci++) {
    const lc   = String.fromCharCode(64+ci)
    const c    = ws.getRow(tr).getCell(ci)
    c.value    = { formula:`SUM(${lc}3:${lc}${lastR})` }
    c.font     = totalFont
    c.fill     = totalFill
    c.alignment= { horizontal:'right', vertical:'middle' }
    c.border   = { left:thin(), right:thin(), top:thin(), bottom:thin() }
    c.numFmt   = '#,##0'
  }

  // ── Récap en bas ──────────────────────────────────────────────────────────
  let rr = tr + 3
  const recap = [
    ['CNSS PART SALARIALE à Payer',  `SUM(H3:H${lastR})+SUM(I3:I${lastR})`],
    ['CNSS PART PATRONALE à Payer',  `SUM(J3:J${lastR})+SUM(K3:K${lastR})`],
    ['Total CNSS',                    `SUM(H3:H${lastR})+SUM(I3:I${lastR})+SUM(J3:J${lastR})+SUM(K3:K${lastR})`],
    ['IRPP à payer',                  avecRegul ? `SUM(N3:N${lastR})` : `SUM(L3:L${lastR})`],
    ['Montant Global à payer',        avecRegul
      ? `SUM(H3:H${lastR})+SUM(I3:I${lastR})+SUM(J3:J${lastR})+SUM(K3:K${lastR})+SUM(N3:N${lastR})`
      : `SUM(H3:H${lastR})+SUM(I3:I${lastR})+SUM(J3:J${lastR})+SUM(K3:K${lastR})+SUM(L3:L${lastR})`],
  ]
  for (const [label, formula] of recap) {
    const cLabel = ws.getRow(rr).getCell(3)
    cLabel.value = label; cLabel.font = { name:'Calibri', size:13, bold:true }
    const cVal   = ws.getRow(rr).getCell(4)
    cVal.value   = { formula }; cVal.numFmt = '#,##0'; cVal.font = { name:'Calibri', size:13, bold:true }
    cVal.border  = { bottom:thin() }
    rr++
  }
}

// ─── SOLDE DE TOUT COMPTE (imitation parfaite SOLDE_DE_TT_COMPTE.xlsx) ────────
function genSolde(wb, sheetName, data) {
  const ws = wb.addWorksheet(sheetName)

  // Largeurs identiques à l'original
  ws.getColumn(1).width = 4
  ws.getColumn(2).width = 38
  ws.getColumn(3).width = 10
  ws.getColumn(4).width = 10
  ws.getColumn(5).width = 20
  ws.getColumn(6).width = 18
  ws.getColumn(7).width = 10
  ws.getColumn(8).width = 14.285

  ws.pageSetup.orientation = 'portrait'
  ws.pageSetup.paperSize   = 9
  ws.pageSetup.fitToPage   = true
  ws.pageSetup.fitToWidth  = 1

  // Hauteurs de lignes comme l'original
  ws.getRow(3).height  = 15.75
  ws.getRow(4).height  = 21.0
  ws.getRow(5).height  = 35.25
  ws.getRow(6).height  = 32.25
  ws.getRow(7).height  = 36.75
  ws.getRow(8).height  = 34.5
  ws.getRow(9).height  = 33.75
  ws.getRow(10).height = 21.75
  ws.getRow(11).height = 21.75

  // ── Titre (row 4, style original : size 20 bold) ─────────────────────────
  ws.mergeCells('B4:H5')
  const titleCell    = ws.getCell('B4')
  titleCell.value    = `   ${data.client_nom||''} : SOLDE DE TOUT COMPTE : ${data.nom||''}`
  titleCell.font     = { name:'Calibri', size:20, bold:true }
  titleCell.alignment= { horizontal:'center', vertical:'middle', wrapText:true }

  // ── Infos (rows 6-9) bold size 14 ────────────────────────────────────────
  const infoLines = [
    [6, `DEPART : ${data.depart||''}`],
    [7, `DATE D'EMBAUCHE :  ${data.date_embauche||''}`],
    [8, `FIN DE CONTRAT : ${data.fin_contrat||''}`],
    [9, `${data.anciennete_label||''}`],
  ]
  for (const [r, txt] of infoLines) {
    ws.mergeCells(`B${r}:H${r}`)
    const c    = ws.getCell(`B${r}`)
    c.value    = txt
    c.font     = { name:'Calibri', size:14, bold:true }
    c.alignment= { horizontal:'left', vertical:'middle' }
  }

  // ── En-têtes CALCUL / BASE / TAUX / MONTANT (rows 10-11) ─────────────────
  ws.mergeCells('F10:H10')
  sc(ws,'F10','CALCUL',  { name:'Calibri', size:16 }, { horizontal:'center', vertical:'middle' })
  sc(ws,'F11','BASE',    { name:'Calibri', size:16 }, { horizontal:'center', vertical:'middle' })
  sc(ws,'G11','TAUX',    { name:'Calibri', size:16 }, { horizontal:'center', vertical:'middle' })
  sc(ws,'H11','MONTANT', { name:'Calibri', size:16 }, { horizontal:'center', vertical:'middle' })

  const font16 = { name:'Calibri', size:16, bold:false }
  const font16b = { name:'Calibri', size:16, bold:true }

  const setRow = (r, h) => { ws.getRow(r).height = h || 28.5 }

  // ── Salaire du mois (row 12) ──────────────────────────────────────────────
  setRow(12, 28.5)
  ws.mergeCells('B12:E12')
  sc(ws,'B12',`\u00a0 ${data.salaire_mois_label||'SALAIRE DU MOIS'} `, font16, { horizontal:'left', vertical:'middle' })
  ws.getCell('H12').value  = data.salaire_mois || 0
  ws.getCell('H12').font   = font16
  ws.getCell('H12').numFmt = '#,##0'
  ws.getCell('H12').alignment = { horizontal:'right' }

  // ── Indemnité congés (row 13) ─────────────────────────────────────────────
  setRow(13, 27.75)
  ws.mergeCells('B13:E13')
  sc(ws,'B13','INDEMNITE DE CONGES ACQUIS NON JOUIR ', font16, { horizontal:'left', vertical:'middle' })
  ws.getCell('F13').value  = data.base_conges || 0
  ws.getCell('F13').font   = font16b
  ws.getCell('F13').numFmt = '#,##0'
  ws.getCell('F13').alignment = { horizontal:'right' }
  const jours = data.jours_conges_list || []
  if (data.taux_conges_auto && jours.length) {
    ws.getCell('G13').value = { formula:`(${jours.map(([j])=>j).join('+')})/30` }
  } else {
    ws.getCell('G13').value = data.taux_conges_manuel || 0
  }
  ws.getCell('G13').font      = font16
  ws.getCell('G13').alignment = { horizontal:'center' }
  ws.getCell('G13').numFmt    = '0.000000'
  ws.getCell('H13').value     = { formula:'F13*G13' }
  ws.getCell('H13').font      = font16
  ws.getCell('H13').numFmt    = '#,##0.00'
  ws.getCell('H13').alignment = { horizontal:'right' }

  // ── TOTAL BRUT (row 14) ───────────────────────────────────────────────────
  setRow(14, 29.25)
  ws.mergeCells('B14:E14')
  sc(ws,'B14',' TOTAL BRUT SOLDE DE TOUT COMPTE', font16b, { horizontal:'left', vertical:'middle' })
  ws.getCell('H14').value  = { formula:'H12+H13' }
  ws.getCell('H14').font   = font16
  ws.getCell('H14').numFmt = '#,##0.00'
  ws.getCell('H14').alignment = { horizontal:'right' }

  // ── CNSS (row 15) — base = H14-140000 comme l'original ───────────────────
  setRow(15, 29.25)
  ws.mergeCells('B15:E15')
  sc(ws,'B15','CNSS', font16, { horizontal:'left', vertical:'middle' })
  ws.getCell('F15').value     = { formula:'H14-140000' }
  ws.getCell('F15').font      = font16b
  ws.getCell('F15').numFmt    = '#,##0'
  ws.getCell('F15').alignment = { horizontal:'right' }
  ws.getCell('G15').value     = 0.04
  ws.getCell('G15').font      = font16
  ws.getCell('G15').numFmt    = '0%'
  ws.getCell('G15').alignment = { horizontal:'center' }
  ws.getCell('H15').value     = { formula:'F15*G15' }
  ws.getCell('H15').font      = font16
  ws.getCell('H15').numFmt    = '#,##0'
  ws.getCell('H15').alignment = { horizontal:'right' }

  // ── AMU (row 16) ─────────────────────────────────────────────────────────
  setRow(16, 29.25)
  ws.mergeCells('B16:E16')
  sc(ws,'B16','AMU', font16, { horizontal:'left', vertical:'middle' })
  ws.getCell('F16').value     = { formula:'H14-140000' }
  ws.getCell('F16').font      = font16b
  ws.getCell('F16').numFmt    = '#,##0'
  ws.getCell('F16').alignment = { horizontal:'right' }
  ws.getCell('G16').value     = 0.05
  ws.getCell('G16').font      = font16
  ws.getCell('G16').numFmt    = '0%'
  ws.getCell('G16').alignment = { horizontal:'center' }
  ws.getCell('H16').value     = { formula:'F16*G16' }
  ws.getCell('H16').font      = font16
  ws.getCell('H16').numFmt    = '#,##0'
  ws.getCell('H16').alignment = { horizontal:'right' }

  // ── IRPP (row 17) ─────────────────────────────────────────────────────────
  setRow(17, 27.0)
  ws.mergeCells('B17:E17')
  sc(ws,'B17','IRPP', font16, { horizontal:'left', vertical:'middle' })
  ws.getCell('H17').value     = data.irpp || 0
  ws.getCell('H17').font      = font16
  ws.getCell('H17').numFmt    = '#,##0'
  ws.getCell('H17').alignment = { horizontal:'right' }

  let r = 18

  // Retenues arriérées si présentes
  if (data.retenues_arrierees) {
    setRow(r, 28.5)
    ws.mergeCells(`B${r}:E${r}`)
    sc(ws,`B${r}`,'TOTAL RETENUES ARRIEREES RESTANT A PRELEVE', font16, { horizontal:'left', vertical:'middle' })
    ws.getCell(`H${r}`).value     = data.retenues_arrierees
    ws.getCell(`H${r}`).font      = font16
    ws.getCell(`H${r}`).numFmt    = '#,##0'
    ws.getCell(`H${r}`).alignment = { horizontal:'right' }
    r++
  }

  // ── TOTAL DES RETENUES ────────────────────────────────────────────────────
  setRow(r, 28.5)
  ws.mergeCells(`B${r}:E${r}`)
  sc(ws,`B${r}`,'TOTAL DES RETENUES', font16b, { horizontal:'left', vertical:'middle' })
  const totalFormula = data.retenues_arrierees ? `H15+H16+H17+H${r-1}` : 'H15+H16+H17'
  ws.getCell(`H${r}`).value     = { formula: totalFormula }
  ws.getCell(`H${r}`).font      = font16b
  ws.getCell(`H${r}`).numFmt    = '#,##0'
  ws.getCell(`H${r}`).alignment = { horizontal:'right' }
  const totR = r; r++

  // ── SALAIRE NET SOLDE DE TOUT COMPTE ─────────────────────────────────────
  setRow(r, 28.5)
  ws.mergeCells(`B${r}:E${r}`)
  sc(ws,`B${r}`,'SALAIRE NET SOLDE DE TOUT COMPTE', font16b, { horizontal:'left', vertical:'middle' })
  ws.getCell(`H${r}`).value     = { formula:`H14-H${totR}` }
  ws.getCell(`H${r}`).font      = font16b
  ws.getCell(`H${r}`).numFmt    = '#,##0'
  ws.getCell(`H${r}`).alignment = { horizontal:'right' }
  const netR = r; r++

  // ── Préavis (optionnel) ───────────────────────────────────────────────────
  let preR = null
  if (data.inclure_preavis) {
    setRow(r, 25.5)
    ws.mergeCells(`B${r}:E${r}`)
    sc(ws,`B${r}`,'MONTANT DU PREAVIS', font16b, { horizontal:'left', vertical:'middle' })
    ws.getCell(`H${r}`).value     = data.preavis || 0
    ws.getCell(`H${r}`).font      = font16b
    ws.getCell(`H${r}`).numFmt    = '#,##0'
    ws.getCell(`H${r}`).alignment = { horizontal:'right' }
    preR = r; r++
  }

  // ── AVANCE SUR SOLDE ──────────────────────────────────────────────────────
  setRow(r, 25.5)
  ws.mergeCells(`B${r}:E${r}`)
  sc(ws,`B${r}`,'AVANCE SUR SOLDE DE TOUT COMPTE', font16b, { horizontal:'left', vertical:'middle' })
  ws.getCell(`H${r}`).value     = data.avance || 0
  ws.getCell(`H${r}`).font      = font16b
  ws.getCell(`H${r}`).numFmt    = '#,##0'
  ws.getCell(`H${r}`).alignment = { horizontal:'right' }
  const avR = r; r++

  // ── RETENUE SUR SOLDE DE TOUT COMPTE ─────────────────────────────────────
  let retSoldeR = null
  if (data.retenue_sur_solde) {
    setRow(r, 25.5)
    ws.mergeCells(`B${r}:E${r}`)
    sc(ws,`B${r}`,'RETENUE SUR SOLDE DE TOUT COMPTE', font16b, { horizontal:'left', vertical:'middle' })
    ws.getCell(`H${r}`).value     = data.retenue_sur_solde
    ws.getCell(`H${r}`).font      = font16b
    ws.getCell(`H${r}`).numFmt    = '#,##0'
    ws.getCell(`H${r}`).alignment = { horizontal:'right' }
    retSoldeR = r; r++
  }

  // ── NET A PAYER ───────────────────────────────────────────────────────────
  setRow(r, 29.25)
  ws.mergeCells(`B${r}:E${r}`)
  sc(ws,`B${r}`,'NET A PAYER', font16b, { horizontal:'left', vertical:'middle' })
  const netPayParts = [netR, preR, avR, retSoldeR].filter(Boolean)
  const netPayFormula = netPayParts.length === 1
    ? `H${netPayParts[0]}`
    : `H${netPayParts[0]}-${netPayParts.slice(1).map(x=>`H${x}`).join('-')}`
  ws.getCell(`H${r}`).value     = { formula: netPayFormula }
  ws.getCell(`H${r}`).font      = font16b
  ws.getCell(`H${r}`).numFmt    = '#,##0'
  ws.getCell(`H${r}`).alignment = { horizontal:'right' }
  const netPayR = r; r++

  // ── SOLDE (ligne finale mise en évidence) ─────────────────────────────────
  setRow(r, 29.25)
  ws.mergeCells(`B${r}:G${r}`)
  ws.getCell(`B${r}`).value     = 'SOLDE'
  ws.getCell(`B${r}`).font      = { name:'Calibri', size:18, bold:true }
  ws.getCell(`B${r}`).alignment = { horizontal:'left', vertical:'middle' }
  ws.getCell(`B${r}`).fill      = { type:'pattern', pattern:'solid', fgColor:{argb:'FFD9E1F2'} }
  ws.getCell(`H${r}`).value     = { formula:`H${netPayR}` }
  ws.getCell(`H${r}`).font      = { name:'Calibri', size:18, bold:true }
  ws.getCell(`H${r}`).numFmt    = '#,##0'
  ws.getCell(`H${r}`).alignment = { horizontal:'right' }
  ws.getCell(`H${r}`).fill      = { type:'pattern', pattern:'solid', fgColor:{argb:'FFD9E1F2'} }
  r++

  // ── Note congés (comme l'original) ───────────────────────────────────────
  if (jours.length) {
    const noteR = r + 3
    ws.getRow(noteR).height    = 15.75
    const total = jours.map(([j])=>j).join(' + ')
    ws.getCell(`B${noteR}`).value = `TAUX DE CONGES ACQUIS NON JOUIR= (${total}) / 30 jours`
    ws.getCell(`B${noteR}`).font  = { name:'Calibri', size:12, bold:true }
    jours.forEach(([j,l], idx) => {
      const nr = noteR + 2 + (idx*2)
      ws.getRow(nr).height = 15.75
      ws.getCell(`B${nr}`).value = `${j} jours= ${l}`
      ws.getCell(`B${nr}`).font  = { name:'Calibri', size:12, bold:true }
    })
  }
}

// ─── ROUTER ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Vercel rewrite: /api/:path* → /api/index?_path=:path*
  const urlObj = new URL(req.url, 'http://x')
  const _p     = urlObj.searchParams.get('_path') || ''
  const path   = _p ? `/api/${_p}`.replace(/\/+$/, '') : req.url.split('?')[0].replace(/\/+$/, '')
  const method = req.method

  res.setHeader('Access-Control-Allow-Credentials', 'true')
  if (method === 'OPTIONS') return res.status(200).end()

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    if (path === '/api/auth/me')         return authMe(req, res)
    if (path === '/api/auth/repair-org') return authRepairOrg(req, res)
    if (path === '/api/auth/signup-org') return authSignupOrg(req, res)
    if (path === '/api/auth/reset-password') return authResetPassword(req, res)
    // /api/auth/debug désactivé en production

    // ── Exports Excel ─────────────────────────────────────────────────────────
    if (path === '/api/export-bulletin') {
      if (method !== 'POST') return res.status(405).end()
      const auth = await requireAuth(req)
      const { period_id, employee_id } = req.body
      if (!period_id || !employee_id) return res.status(400).json({ error: 'period_id et employee_id requis' })
      const db = neon(DB_URL())
      const rows = await db`
        SELECT pv.*, e.first_name, e.last_name, e.position, e.social_security_number,
               e.hire_date, e.phone, e.children_count, e.marital_status, e.category,
               c.name as client_name, c.nif as client_nif, c.num_employeur, c.logo_url,
               c.bp, c.entite_name, c.phone as client_phone,
               pp.period_month, pp.period_year
        FROM payroll_variables pv
        JOIN employees e  ON e.id  = pv.employee_id
        JOIN payroll_periods pp ON pp.id = pv.period_id
        JOIN clients c    ON c.id  = pp.client_id
        WHERE pv.period_id=${period_id} AND pv.employee_id=${employee_id}
      `
      if (!rows.length) return res.status(404).json({ error: 'Variables de paie introuvables. Enregistrez d\'abord les variables dans la période de paie.' })
      const v = rows[0]
      const MOIS = ['JANVIER','FEVRIER','MARS','AVRIL','MAI','JUIN','JUILLET','AOUT','SEPTEMBRE','OCTOBRE','NOVEMBRE','DECEMBRE']
      const mois = MOIS[(v.period_month||1)-1]
      const brut = calcBrut(v)
      const pers = calcPersonnesCharge(v.marital_status, v.children_count)
      const irpp = calcIrppMensuel(brut, pers)

      const rubriques = []
      if (v.base_salary)         rubriques.push({ label:'Salaire de Base',        base:v.base_salary,        taux_ou_nb:30 })
      if (v.sursalaire)          rubriques.push({ label:'Sursalaire',             base:v.sursalaire,          taux_ou_nb:30 })
      if (v.hire_date) {
        const ann = Math.floor((Date.now()-new Date(v.hire_date))/(1000*60*60*24*365))
        if (ann >= 2) rubriques.push({ label:'Ancienneté', base:Math.round(((v.base_salary||0)+(v.sursalaire||0))*ann*0.02), taux_ou_nb:30 })
      }
      if (v.indemnite_fonction)      rubriques.push({ label:'Indemnité de fonction',     base:v.indemnite_fonction,      taux_ou_nb:30 })
      if (v.indemnite_logement)      rubriques.push({ label:'Indemnité de logement',     base:v.indemnite_logement,      taux_ou_nb:30 })
      if (v.indemnite_transport)     rubriques.push({ label:'Indemnité de Transport',    base:v.indemnite_transport,     taux_ou_nb:30 })
      if (v.indemnite_repas)         rubriques.push({ label:'Indemnité de repas',        base:v.indemnite_repas,         taux_ou_nb:30 })
      if (v.indemnite_communication) rubriques.push({ label:'Indemnité de communication',base:v.indemnite_communication, taux_ou_nb:30 })

      let logoBuffer = null
      if (v.logo_url) {
        try {
          const lr = await fetch(v.logo_url)
          if (lr.ok) logoBuffer = Buffer.from(await lr.arrayBuffer())
        } catch {}
      }

      // IRPP: brut imposable = brut × (1 - 4% - 5%), annualisé puis régularisé
      const brutImposableMensuel = brut * (1 - 0.04 - 0.05)
      const revenuAnnuel = brutImposableMensuel * 12
      const abattement = Math.min(revenuAnnuel, 10_000_000) * 0.28
      const chargesFamille = pers * 10_000 * 12
      const imposableAnnuel = Math.floor(Math.max(0, revenuAnnuel - abattement - chargesFamille) / 1000) * 1000
      const irpp_base = Math.round(imposableAnnuel / 12)

      const wb2 = new ExcelJS.Workbook()
      genBulletin(wb2, `${(v.last_name||'').substring(0,3)} ${mois.substring(0,4)} ${v.period_year}`, {
        nom: `${v.last_name} ${v.first_name}`,
        n_assure: v.social_security_number || '',
        nif_employe: v.client_nif || '',
        nif: v.client_nif || '',
        direction: v.category || '',
        poste: v.position || '',
        telephone: v.phone || '',
        telephone_client: v.client_phone || '',
        date_embauche: v.hire_date ? new Date(v.hire_date).toLocaleDateString('fr-FR') : '',
        personnes_charge: pers,
        rubriques,
        avance_salaire: v.avance_salaire || 0,
        irpp,
        irpp_base,
        logoBuffer,
        client_name: v.client_name || '',
        client_adresse: [v.bp, v.entite_name].filter(Boolean).join(' - '),
        num_employeur: v.num_employeur || '',
        mois_label: mois,
        period_month: v.period_month,
        period_year: v.period_year,
      })
      // Archive bulletin: sauvegarder dans Vercel Blob si disponible
      try {
        if (process.env.BLOB_READ_WRITE_TOKEN) {
          const blobBuf = await wb2.xlsx.writeBuffer()
          const { put: blobPut } = await import('@vercel/blob')
          const blobResult = await blobPut(
            `bulletins/${auth.orgId}/${period_id}/${employee_id}_${mois}_${v.period_year}.xlsx`,
            blobBuf,
            { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN }
          )
          // Mettre à jour bulletin_url dans payroll_variables
          await db`UPDATE payroll_variables SET bulletin_url = ${blobResult.url} WHERE period_id = ${period_id} AND employee_id = ${employee_id}`
        }
      } catch (archiveErr) {
        console.warn('[bulletin-archive]', archiveErr.message)
      }
      
      // Regénérer le workbook pour le téléchargement (l'écriture précédente a consommé le stream)
      const wb3 = new ExcelJS.Workbook()
      genBulletin(wb3, `${(v.last_name||'').substring(0,3)} ${mois.substring(0,4)} ${v.period_year}`, {
        nom: `${v.last_name} ${v.first_name}`,
        n_assure: v.social_security_number || '',
        nif_employe: v.client_nif || '',
        nif: v.client_nif || '',
        direction: v.category || '',
        poste: v.position || '',
        telephone: v.phone || '',
        telephone_client: v.client_phone || '',
        date_embauche: v.hire_date ? new Date(v.hire_date).toLocaleDateString('fr-FR') : '',
        personnes_charge: pers,
        rubriques,
        avance_salaire: v.avance_salaire || 0,
        irpp,
        irpp_base,
        logoBuffer,
        client_name: v.client_name || '',
        client_adresse: [v.bp, v.entite_name].filter(Boolean).join(' - '),
        num_employeur: v.num_employeur || '',
        mois_label: mois,
        period_month: v.period_month,
        period_year: v.period_year,
      })
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename="Bulletin_${v.last_name}_${mois}_${v.period_year}.xlsx"`)
      await wb3.xlsx.write(res)
      return res.end()
    }

    if (path === '/api/export-etat-charges') {
      if (method !== 'POST') return res.status(405).end()
      await requireAuth(req)
      const { period_id, avec_regularisation } = req.body
      const db = neon(DB_URL())
      const rows = await db`
        SELECT pv.*, e.first_name, e.last_name, e.position, e.children_count,
               e.marital_status, e.responsable, e.pole,
               c.name as client_name, pp.period_month, pp.period_year
        FROM payroll_variables pv
        JOIN employees e ON e.id = pv.employee_id
        JOIN payroll_periods pp ON pp.id = pv.period_id
        JOIN clients c ON c.id = pp.client_id
        WHERE pv.period_id = ${period_id}
        ORDER BY e.last_name
      `
      if (!rows.length) return res.status(404).json({ error: 'Aucune variable de paie pour cette période. Saisissez et enregistrez les variables dans Périodes de paie d\'abord.' })
      const p = rows[0]
      const MOIS = ['JANVIER','FEVRIER','MARS','AVRIL','MAI','JUIN','JUILLET','AOUT','SEPTEMBRE','OCTOBRE','NOVEMBRE','DECEMBRE']
      const mois = MOIS[(p.period_month||1)-1]
      const employes = rows.map(v => {
        const brut = calcBrut(v)
        const pers = calcPersonnesCharge(v.marital_status, v.children_count)
        const irpp = calcIrppMensuel(brut, pers)
        const net  = brut - Math.round(brut*0.04) - Math.round(brut*0.05) - irpp
                   - (v.avance_salaire||0) - (v.remboursement_pret||0) - (v.deduction_forfaitaire||0)
        return {
          nom: `${v.last_name} ${v.first_name}`,
          responsable: v.responsable || '',
          poste: v.position || '',
          pole: v.pole || '',
          brut_imposable: brut,
          irpp,
          net_payer: Math.round(net),
          regularisation_irpp: v.regularisation_irpp || 0,
        }
      })
      const suffix = avec_regularisation ? 'AVEC REGULARISATION' : 'SANS REGULARISATION'
      const wb2 = new ExcelJS.Workbook()
      genEtatCharges(wb2,
        `${mois.substring(0,4)} ${p.period_year}${avec_regularisation?' REGUL':''}`,
        `${p.client_name}: ETAT DES RETENUES ET SALAIRES NETS A PAYER ${mois} ${p.period_year} ${suffix}`,
        employes, !!avec_regularisation)
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename="Etat_Charges_${mois}_${p.period_year}.xlsx"`)
      await wb2.xlsx.write(res)
      return res.end()
    }

    if (path === '/api/export-bordereau-cnss') {
      if (method !== 'POST') return res.status(405).end()
      return handleExportBordereau(req, res, 'cnss')
    }

    if (path === '/api/export-irpp') {
      if (method !== 'POST') return res.status(405).end()
      return handleExportBordereau(req, res, 'irpp')
    }

    if (path === '/api/salary-grid-suggestion') {
      if (method !== 'GET') return res.status(405).end()
      return handleGridSuggestion(req, res)
    }

    if (path === '/api/export-solde') {
      if (method !== 'POST') return res.status(405).end()
      await requireAuth(req)
      const { employee_id, period_id, date_depart, date_fin_contrat,
              jours_conges_list, taux_conges_auto, taux_conges_manuel,
              avance, preavis, inclure_preavis, retenues_arrierees, regularisation_irpp,
              retenue_sur_solde } = req.body
      const db = neon(DB_URL())
      const [emp] = await db`SELECT e.*, c.name as client_name FROM employees e JOIN clients c ON c.id=e.client_id WHERE e.id=${employee_id}`
      if (!emp) return res.status(404).json({ error: 'Employé introuvable' })
      let vars = null
      if (period_id) {
        const vRows = await db`SELECT * FROM payroll_variables WHERE period_id=${period_id} AND employee_id=${employee_id}`
        vars = vRows[0] || null
      }
      const brut = vars ? calcBrut(vars) : 0
      const pers = calcPersonnesCharge(emp.marital_status, emp.children_count)
      const irpp = calcIrppMensuel(brut, pers) + (regularisation_irpp||0)
      const departDate = new Date(date_depart || Date.now())
      const hireDate   = emp.hire_date ? new Date(emp.hire_date) : null
      const ann = hireDate ? Math.floor((departDate-hireDate)/(1000*60*60*24*365)) : 0
      const fmt = d => d ? new Date(d).toLocaleDateString('fr-FR') : ''

      const wb2 = new ExcelJS.Workbook()
      genSolde(wb2, emp.last_name, {
        nom: `${emp.last_name} ${emp.first_name}`,
        client_nom: emp.client_name || '',
        depart: fmt(date_depart),
        date_embauche: fmt(emp.hire_date),
        fin_contrat: fmt(date_fin_contrat || date_depart),
        anciennete_label: ann <= 0 ? '0 an' : ann === 1 ? '1 an' : `${ann} ans`,
        salaire_mois: brut,
        salaire_mois_label: `SALAIRE DU MOIS DE ${departDate.toLocaleDateString('fr-FR',{month:'long'}).toUpperCase()}`,
        base_conges: brut,
        jours_conges_list: jours_conges_list || [],
        taux_conges_auto: taux_conges_auto !== false,
        taux_conges_manuel: taux_conges_manuel || 0,
        irpp,
        avance: avance || 0,
        preavis: preavis || 0,
        inclure_preavis: !!inclure_preavis,
        retenues_arrierees: retenues_arrierees || 0,
        retenue_sur_solde: retenue_sur_solde || 0,
      })
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename="Solde_${emp.last_name}_${fmt(date_depart).replace(/\//g,'-')}.xlsx"`)
      await wb2.xlsx.write(res)
      return res.end()
    }

    // ── Paramètres ────────────────────────────────────────────────────────────
    if (path === '/api/settings/org') {
      const auth = await requireAuth(req)
      const db = neon(DB_URL())
      if (method === 'GET') {
        const rows = await db`SELECT o.id, o.name FROM organizations o JOIN user_profiles up ON up.organization_id=o.id WHERE up.user_id=${auth.userId}`
        if (!rows.length) return res.status(404).json({ error: 'Organisation introuvable' })
        return res.status(200).json(rows[0])
      }
      if (method === 'PATCH') {
        const { name } = req.body
        if (!name?.trim()) return res.status(400).json({ error: 'Nom requis' })
        const rows = await db`UPDATE organizations SET name=${name.trim()} WHERE id=${auth.orgId} RETURNING id, name`
        return res.status(200).json(rows[0])
      }
      return res.status(405).end()
    }

    if (path === '/api/settings/profile') {
      if (method !== 'PATCH') return res.status(405).end()
      const auth = await requireAuth(req)
      const db = neon(DB_URL())
      const { name } = req.body
      if (!name?.trim()) return res.status(400).json({ error: 'Nom requis' })
      // Mettre à jour le nom dans la table user (Better Auth)
      try {
        await db`UPDATE "user" SET name=${name.trim()} WHERE id=${auth.userId}`
        return res.status(200).json({ ok: true, name: name.trim() })
      } catch {
        return res.status(200).json({ ok: true }) // silently ok even if col doesn't exist
      }
    }

    if (path === '/api/settings/change-password') {
      if (method !== 'POST') return res.status(405).end()
      await requireAuth(req)
      const { current_password, new_password } = req.body
      if (!current_password || !new_password) return res.status(400).json({ error: 'Mots de passe requis' })
      if (new_password.length < 8) return res.status(400).json({ error: 'Nouveau mot de passe: 8 caractères minimum' })
      // Proxy vers Neon Auth change-password
      try {
        const r = await fetch(`${NEON_AUTH_BASE_URL}/change-password`, {
          method: 'POST',
          headers: { 'origin': process.env.BETTER_AUTH_URL||'', 'content-type': 'application/json', 'cookie': req.headers?.cookie || '' },
          body: JSON.stringify({ currentPassword: current_password, newPassword: new_password }),
          signal: AbortSignal.timeout(8000),
        })
        const data = await r.json().catch(() => ({}))
        return res.status(r.status).json(r.ok ? { ok: true } : { error: data.message || data.error || 'Erreur changement mot de passe' })
      } catch (e) {
        return res.status(500).json({ error: e.message })
      }
    }

    // ── CRUD (nécessite auth) ─────────────────────────────────────────────────
    const auth = await requireAuth(req)
    const qpObj = new URL(req.url, 'http://x')
    qpObj.searchParams.delete('_path')
    const qp = Object.fromEntries(qpObj.searchParams)

    // Vérification orgId sur toutes les routes CRUD
    if (!auth.orgId) return res.status(403).json({ error: 'Aucune organisation liée à ce compte. Rechargez la page.' })

    // Clients
    if (path === '/api/clients') {
      const { id } = qp
      if (id) {
        if (method === 'GET')    { const r=await sql('SELECT * FROM clients WHERE id=$1 AND organization_id=$2',[id,auth.orgId]); return res.status(r.rows.length?200:404).json(r.rows[0]||{error:'Introuvable'}) }
        if (method === 'PUT' || method === 'PATCH') {
          const b=req.body
          const r=await sql(`UPDATE clients SET name=$1,address=$2,phone=$3,email=$4,ifu=$5,rccm=$6,sector=$7,num_employeur=$8,nif=$9,bp=$10,entite_name=$11,logo_url=$12,updated_at=NOW() WHERE id=$13 AND organization_id=$14 RETURNING *`,
            [b.name,b.address||null,b.phone||null,b.email||null,b.ifu||null,b.rccm||null,b.sector||null,b.num_employeur||null,b.nif||null,b.bp||null,b.entite_name||null,b.logo_url||null,id,auth.orgId])
          return res.status(200).json(r.rows[0])
        }
        if (method === 'DELETE') { await sql('DELETE FROM clients WHERE id=$1 AND organization_id=$2',[id,auth.orgId]); return res.status(200).json({ok:true}) }
      } else {
        if (method === 'GET')  { const r=await sql('SELECT * FROM clients WHERE organization_id=$1 ORDER BY name',[auth.orgId]); return res.status(200).json(r.rows) }
        if (method === 'POST') {
          const b=req.body
          const r=await sql(`INSERT INTO clients (organization_id,name,address,phone,email,ifu,rccm,sector,num_employeur,nif,bp,entite_name,logo_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
            [auth.orgId,b.name,b.address||null,b.phone||null,b.email||null,b.ifu||null,b.rccm||null,b.sector||null,b.num_employeur||null,b.nif||null,b.bp||null,b.entite_name||null,b.logo_url||null])
          return res.status(201).json(r.rows[0])
        }
      }
    }

    // Employés
    if (path === '/api/employees') {
      const { id, client_id: clientId } = qp
      if (id) {
        if (method === 'GET')    { const r=await sql(`SELECT e.*,c.name as client_name FROM employees e JOIN clients c ON e.client_id=c.id WHERE e.id=$1 AND c.organization_id=$2`,[id,auth.orgId]); return res.status(r.rows.length?200:404).json(r.rows[0]||{error:'Introuvable'}) }
        if (method === 'PUT' || method === 'PATCH') {
          const b=req.body
          const r=await sql(`UPDATE employees SET client_id=$1,matricule=$2,first_name=$3,last_name=$4,gender=$5,birth_date=$6,hire_date=$7,position=$8,category=$9,marital_status=$10,children_count=$11,social_security_number=$12,phone=$13,email=$14,active=$15,status=$16,contract_type=$17,contract_end_date=$18,pole=$19,responsable=$20,updated_at=NOW() WHERE id=$21 RETURNING *`,
            [b.client_id,b.matricule||null,b.first_name,b.last_name,b.gender||'M',b.birth_date||null,b.hire_date||null,b.position||null,b.category||null,b.marital_status,b.children_count||0,b.social_security_number||null,b.phone||null,b.email||null,b.active!==false,b.status||'actif',b.contract_type||'cdi',b.contract_end_date||null,b.pole||null,b.responsable||null,id])
          return res.status(200).json(r.rows[0])
        }
        if (method === 'DELETE') { await sql('DELETE FROM employees WHERE id=$1',[id]); return res.status(200).json({ok:true}) }
      } else {
        if (method === 'GET')  {
          let q=`SELECT e.*,c.name as client_name FROM employees e JOIN clients c ON e.client_id=c.id WHERE c.organization_id=$1`
          const p=[auth.orgId]
          if (clientId) { q+=' AND e.client_id=$2'; p.push(clientId) }
          q+=' ORDER BY e.last_name'
          const r=await sql(q,p); return res.status(200).json(r.rows)
        }
        if (method === 'POST') {
          const b=req.body
          const r=await sql(`INSERT INTO employees (client_id,matricule,first_name,last_name,gender,birth_date,hire_date,position,category,marital_status,children_count,social_security_number,phone,email,active,status,contract_type,contract_end_date,pole,responsable) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
            [b.client_id,b.matricule||null,b.first_name,b.last_name,b.gender||'M',b.birth_date||null,b.hire_date||null,b.position||null,b.category||null,b.marital_status||'celibataire',b.children_count||0,b.social_security_number||null,b.phone||null,b.email||null,b.active!==false,b.status||'actif',b.contract_type||'cdi',b.contract_end_date||null,b.pole||null,b.responsable||null])
          return res.status(201).json(r.rows[0])
        }
      }
    }

    // Périodes de paie
    if (path === '/api/payroll') {
      const { id, client_id: clientId } = qp
      if (id) {
        if (method === 'GET') {
          const r=await sql(`SELECT pp.*,c.name as client_name,c.logo_url,c.num_employeur,c.nif,c.bp,c.phone as client_phone,c.entite_name FROM payroll_periods pp JOIN clients c ON pp.client_id=c.id WHERE pp.id=$1 AND c.organization_id=$2`,[id,auth.orgId])
          return res.status(r.rows.length?200:404).json(r.rows[0]||{error:'Introuvable'})
        }
        if (method === 'PATCH') {
          const b=req.body; const keys=Object.keys(b)
          const sets=keys.map((k,i)=>`${k}=$${i+1}`).join(', ')
          const vals=[...Object.values(b),id]
          const r=await sql(`UPDATE payroll_periods SET ${sets},updated_at=NOW() WHERE id=$${vals.length} RETURNING *`,vals)
          return res.status(200).json(r.rows[0])
        }
      } else {
        if (method === 'GET') {
          let q=`SELECT pp.*,c.name as client_name FROM payroll_periods pp JOIN clients c ON pp.client_id=c.id WHERE c.organization_id=$1`
          const p=[auth.orgId]
          if (clientId) { q+=' AND pp.client_id=$2'; p.push(clientId) }
          q+=' ORDER BY pp.period_year DESC,pp.period_month DESC'
          const r=await sql(q,p); return res.status(200).json(r.rows)
        }
        if (method === 'POST') {
          const { client_id, period_month, period_year } = req.body
          const ex=await sql('SELECT id FROM payroll_periods WHERE client_id=$1 AND period_year=$2 AND period_month=$3',[client_id,period_year,period_month])
          if (ex.rows.length) return res.status(409).json({ error:'Période déjà existante' })
          const r=await sql('INSERT INTO payroll_periods (client_id,period_month,period_year,status) VALUES ($1,$2,$3,$4) RETURNING *',[client_id,period_month,period_year,'open'])
          return res.status(201).json(r.rows[0])
        }
      }
    }

    // Variables de paie
    if (path === '/api/payroll-variables') {
      const { period_id, employee_id } = qp
      if (method === 'GET') {
        let q=`SELECT pv.*,e.first_name,e.last_name,e.matricule,e.position,e.category,e.marital_status,e.children_count FROM payroll_variables pv JOIN employees e ON pv.employee_id=e.id WHERE pv.period_id=$1`
        const p=[period_id]
        if (employee_id) { q+=' AND pv.employee_id=$2'; p.push(employee_id) }
        const r=await sql(q,p); return res.status(200).json(r.rows)
      }
      if (method === 'POST' || method === 'PUT') {
        const b=req.body
        const ex=await sql('SELECT id FROM payroll_variables WHERE period_id=$1 AND employee_id=$2',[b.period_id,b.employee_id])
        let r
        if (ex.rows.length) {
          const { period_id:_p, employee_id:_e, ...rest } = b
          const keys=Object.keys(rest)
          const sets=keys.map((k,i)=>`${k}=$${i+1}`).join(', ')
          r=await sql(`UPDATE payroll_variables SET ${sets},updated_at=NOW() WHERE id=$${keys.length+1} RETURNING *`,[...Object.values(rest),ex.rows[0].id])
        } else {
          const keys=Object.keys(b)
          r=await sql(`INSERT INTO payroll_variables (${keys.join(',')}) VALUES (${keys.map((_,i)=>`$${i+1}`).join(',')}) RETURNING *`,Object.values(b))
        }
        return res.status(200).json(r.rows[0])
      }
    }

    // Grilles salariales
    if (path === '/api/salary-grids') {
      const { id } = qp
      if (id) {
        if (method === 'PUT')    { const b=req.body; const r=await sql('UPDATE salary_grids SET category=$1,echelon=$2,base_salary=$3,hourly_rate=$4 WHERE id=$5 RETURNING *',[b.category,b.echelon,b.base_salary,b.hourly_rate,id]); return res.status(200).json(r.rows[0]) }
        if (method === 'DELETE') { await sql('DELETE FROM salary_grids WHERE id=$1',[id]); return res.status(200).json({ok:true}) }
      } else {
        if (method === 'GET')  { const r=await sql(`SELECT sg.*,c.name as client_name FROM salary_grids sg JOIN clients c ON sg.client_id=c.id WHERE c.organization_id=$1 ORDER BY sg.category,sg.echelon`,[auth.orgId]); return res.status(200).json(r.rows) }
        if (method === 'POST') { const b=req.body; const r=await sql('INSERT INTO salary_grids (client_id,category,echelon,base_salary,hourly_rate) VALUES ($1,$2,$3,$4,$5) RETURNING *',[b.client_id,b.category,b.echelon||1,b.base_salary||0,b.hourly_rate||0]); return res.status(201).json(r.rows[0]) }
      }
    }

    // Journal d'activité
    if (path === '/api/activity') {
      if (method === 'GET')  { const r=await sql('SELECT * FROM activity_logs WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 100',[auth.orgId]); return res.status(200).json(r.rows) }
      if (method === 'POST') { const { action, details }=req.body; await sql('INSERT INTO activity_logs (organization_id,user_id,action,details) VALUES ($1,$2,$3,$4)',[auth.orgId,auth.userId,action,details||null]); return res.status(201).json({ok:true}) }
    }

    // Upload logo
    if (path === '/api/upload-logo') {
      if (method !== 'POST') return res.status(405).end()
      let buffer
      if (req.body && Buffer.isBuffer(req.body)) {
        buffer = req.body
      } else if (req.body instanceof Uint8Array) {
        buffer = Buffer.from(req.body)
      } else {
        // Vercel n'a pas parsé ce body (binary) - lire manuellement
        const chunks = []
        for await (const chunk of req) chunks.push(chunk)
        buffer = Buffer.concat(chunks)
      }
      const contentType = req.headers['x-content-type'] || 'image/png'
      const filename    = req.headers['x-filename']     || `logo-${Date.now()}.png`
      const blob = await put(`logos/${filename}`, buffer, { access:'public', contentType, token:process.env.BLOB_READ_WRITE_TOKEN })
      return res.status(200).json({ url: blob.url })
    }

    return res.status(404).json({ error: `Route introuvable: ${path}` })

  } catch (e) {
    // silent — errors returned as JSON 500
    const is401 = e.message?.includes('auth') || e.message?.includes('authentif') ||
                  e.message?.includes('Session') || e.message?.includes('cookie')
    return res.status(is401 ? 401 : 500).json({ error: e.message })
  }
}

// ─── AUTH RESET PASSWORD ──────────────────────────────────────────────────────
async function authResetPassword(req, res) {
  // Proxy vers Neon Auth reset-password
  try {
    const r = await fetch(`${NEON_AUTH_BASE_URL}/forget-password`, {
      method: 'POST',
      headers: { 'origin': process.env.BETTER_AUTH_URL||'', 'content-type': 'application/json' },
      body: JSON.stringify(req.body || {}),
      signal: AbortSignal.timeout(8000),
    })
    const data = await r.json().catch(() => ({}))
    return res.status(r.status).json(data)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}

// ─── BORDEREAU CNSS ───────────────────────────────────────────────────────────
function genBordereauCNSS(wb, sheetName, title, employes, mois, annee) {
  const ws = wb.addWorksheet(sheetName)
  ws.pageSetup.orientation = 'landscape'
  ws.pageSetup.paperSize = 9

  const col_widths = [6, 35, 15, 15, 15, 15, 15, 15, 15]
  col_widths.forEach((w, i) => ws.getColumn(i+1).width = w)

  // Titre
  ws.mergeCells('A1:I1')
  const t = ws.getCell('A1')
  t.value = title
  t.font = { name:'Calibri', size:14, bold:true }
  t.alignment = { horizontal:'center', vertical:'center' }
  ws.getRow(1).height = 24

  // Sous-titre
  ws.mergeCells('A2:I2')
  ws.getCell('A2').value = `Période : ${mois} ${annee}`
  ws.getCell('A2').font = { name:'Calibri', size:11, bold:true }
  ws.getCell('A2').alignment = { horizontal:'center' }

  // En-têtes
  const headers = ['N°', 'Nom et Prénoms', 'N° Assuré', 'Salaire Brut', 'CNSS Salarié 4%', 'CNSS Patronale 17,5%', 'AMU Salarié 5%', 'AMU Patronale 5%', 'TOTAL CNSS+AMU']
  const hFill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF1F3864'} }
  for (let ci=1; ci<=9; ci++) {
    const c = ws.getRow(4).getCell(ci)
    c.value = headers[ci-1]
    c.font = { name:'Calibri', size:10, bold:true, color:{argb:'FFFFFFFF'} }
    c.alignment = { horizontal:'center', vertical:'center', wrapText:true }
    c.fill = hFill
    c.border = { left:{style:'thin'}, right:{style:'thin'}, top:{style:'thin'}, bottom:{style:'thin'} }
  }
  ws.getRow(4).height = 35

  // Données
  for (let i=0; i<employes.length; i++) {
    const r = i+5; const emp = employes[i]
    const brut = emp.brut
    const cnss_s = Math.round(brut * 0.04)
    const cnss_p = Math.round(brut * 0.175)
    const amu_s  = Math.round(brut * 0.05)
    const amu_p  = Math.round(brut * 0.05)
    const total  = cnss_s + cnss_p + amu_s + amu_p

    const vals = [i+1, emp.nom, emp.n_assure||'', brut, cnss_s, cnss_p, amu_s, amu_p, total]
    for (let ci=1; ci<=9; ci++) {
      const c = ws.getRow(r).getCell(ci)
      c.value = vals[ci-1]
      c.font = { name:'Calibri', size:10 }
      c.border = { left:{style:'thin'}, right:{style:'thin'}, top:{style:'thin'}, bottom:{style:'thin'} }
      if (ci >= 4) c.numFmt = '#,##0'
    }
  }

  // Total
  const tr = employes.length + 5
  ws.getRow(tr).getCell(2).value = 'TOTAL'
  ws.getRow(tr).getCell(2).font = { name:'Calibri', size:11, bold:true }
  for (let ci=4; ci<=9; ci++) {
    const lc = String.fromCharCode(64+ci)
    const c = ws.getRow(tr).getCell(ci)
    c.value = { formula: `SUM(${lc}5:${lc}${tr-1})` }
    c.font = { name:'Calibri', size:11, bold:true }
    c.numFmt = '#,##0'
    c.border = { left:{style:'thin'}, right:{style:'thin'}, top:{style:'medium'}, bottom:{style:'medium'} }
  }
}

// ─── BORDEREAU AMU ────────────────────────────────────────────────────────────
function genBordereauAMU(wb, sheetName, title, employes, mois, annee) {
  // Même structure que CNSS mais focusé AMU
  genBordereauCNSS(wb, sheetName, title, employes, mois, annee)
}

// ─── DÉCLARATION IRPP TRIMESTRIELLE ───────────────────────────────────────────
function genDeclarationIRPP(wb, sheetName, title, employes, trimestre, annee) {
  const ws = wb.addWorksheet(sheetName)
  ws.pageSetup.orientation = 'landscape'
  ws.pageSetup.paperSize = 9

  ws.getColumn(1).width = 6
  ws.getColumn(2).width = 35
  ws.getColumn(3).width = 18
  ws.getColumn(4).width = 18
  ws.getColumn(5).width = 18
  ws.getColumn(6).width = 18

  ws.mergeCells('A1:F1')
  const t = ws.getCell('A1')
  t.value = title
  t.font = { name:'Calibri', size:14, bold:true }
  t.alignment = { horizontal:'center' }
  ws.getRow(1).height = 24

  ws.mergeCells('A2:F2')
  ws.getCell('A2').value = `Trimestre ${trimestre} - ${annee}`
  ws.getCell('A2').font = { name:'Calibri', size:11, bold:true }
  ws.getCell('A2').alignment = { horizontal:'center' }

  const headers = ['N°', 'Nom et Prénoms', 'Revenu brut imposable', 'IRPP calculé', 'Régularisation', 'IRPP à verser']
  const hFill = { type:'pattern', pattern:'solid', fgColor:{argb:'FF1F3864'} }
  for (let ci=1; ci<=6; ci++) {
    const c = ws.getRow(4).getCell(ci)
    c.value = headers[ci-1]
    c.font = { name:'Calibri', size:10, bold:true, color:{argb:'FFFFFFFF'} }
    c.alignment = { horizontal:'center', vertical:'center', wrapText:true }
    c.fill = hFill
    c.border = { left:{style:'thin'}, right:{style:'thin'}, top:{style:'thin'}, bottom:{style:'thin'} }
  }
  ws.getRow(4).height = 35

  for (let i=0; i<employes.length; i++) {
    const r = i+5; const emp = employes[i]
    const vals = [i+1, emp.nom, emp.brut_imposable||0, emp.irpp||0, emp.regularisation||0, (emp.irpp||0)+(emp.regularisation||0)]
    for (let ci=1; ci<=6; ci++) {
      const c = ws.getRow(r).getCell(ci)
      c.value = vals[ci-1]
      c.font = { name:'Calibri', size:10 }
      c.border = { left:{style:'thin'}, right:{style:'thin'}, top:{style:'thin'}, bottom:{style:'thin'} }
      if (ci >= 3) c.numFmt = '#,##0'
    }
  }

  const tr = employes.length + 5
  ws.getRow(tr).getCell(2).value = 'TOTAL'
  ws.getRow(tr).getCell(2).font = { name:'Calibri', size:11, bold:true }
  for (let ci=3; ci<=6; ci++) {
    const lc = String.fromCharCode(64+ci)
    const c = ws.getRow(tr).getCell(ci)
    c.value = { formula: `SUM(${lc}5:${lc}${tr-1})` }
    c.font = { name:'Calibri', size:11, bold:true }
    c.numFmt = '#,##0'
    c.border = { left:{style:'thin'}, right:{style:'thin'}, top:{style:'medium'}, bottom:{style:'medium'} }
  }
}

// ─── ROUTES EXPORT BORDEREAU + IRPP ──────────────────────────────────────────
async function handleExportBordereau(req, res, type) {
  await requireAuth(req)
  const { period_id } = req.body
  if (!period_id) return res.status(400).json({ error: 'period_id requis' })
  const db = neon(DB_URL())
  const rows = await db`
    SELECT pv.*, e.first_name, e.last_name, e.social_security_number,
           e.children_count, e.marital_status,
           c.name as client_name, pp.period_month, pp.period_year
    FROM payroll_variables pv
    JOIN employees e ON e.id = pv.employee_id
    JOIN payroll_periods pp ON pp.id = pv.period_id
    JOIN clients c ON c.id = pp.client_id
    WHERE pv.period_id = ${period_id}
    ORDER BY e.last_name
  `
  if (!rows.length) return res.status(404).json({ error: 'Aucune variable de paie pour cette période.' })
  const p = rows[0]
  const MOIS = ['JANVIER','FEVRIER','MARS','AVRIL','MAI','JUIN','JUILLET','AOUT','SEPTEMBRE','OCTOBRE','NOVEMBRE','DECEMBRE']
  const mois = MOIS[(p.period_month||1)-1]
  const annee = p.period_year || ''
  const employes = rows.map(v => ({
    nom: `${v.last_name} ${v.first_name}`,
    n_assure: v.social_security_number || '',
    brut: calcBrut(v),
    brut_imposable: Math.round(calcBrut(v) * 0.91),
    irpp: calcIrppMensuel(calcBrut(v), calcPersonnesCharge(v.marital_status, v.children_count)),
    regularisation: v.regularisation_irpp || 0,
  }))

  const wb2 = new ExcelJS.Workbook()
  let filename = ''
  if (type === 'cnss') {
    genBordereauCNSS(wb2, `CNSS ${mois} ${annee}`, `${p.client_name} : BORDEREAU CNSS/AMU - ${mois} ${annee}`, employes, mois, annee)
    filename = `Bordereau_CNSS_${mois}_${annee}.xlsx`
  } else if (type === 'irpp') {
    const trimestre = Math.ceil((p.period_month||1) / 3)
    genDeclarationIRPP(wb2, `IRPP T${trimestre} ${annee}`, `${p.client_name} : DÉCLARATION IRPP TRIMESTRIELLE T${trimestre} ${annee}`, employes, trimestre, annee)
    filename = `IRPP_T${trimestre}_${annee}.xlsx`
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  await wb2.xlsx.write(res)
  return res.end()
}

// ─── SALARY GRID SUGGESTION ───────────────────────────────────────────────────
async function handleGridSuggestion(req, res) {
  await requireAuth(req)
  const { client_id, category } = req.query || {}
  if (!client_id || !category) return res.status(400).json({ error: 'client_id et category requis' })
  const db = neon(DB_URL())
  const rows = await db`
    SELECT * FROM salary_grids
    WHERE client_id = ${client_id} AND LOWER(category) = LOWER(${category})
    ORDER BY echelon DESC LIMIT 1
  `
  return res.status(200).json(rows[0] || null)
}
