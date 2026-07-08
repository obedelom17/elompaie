import { sql } from './_db.js'
import { requireAuth } from './_auth.js'
export const config = { runtime: 'nodejs' }
export default async function handler(req, res) {
  try {
    const auth = await requireAuth(req)
    const id = req.query?.id
    if (id) {
      if (req.method === 'GET') {
        const r = await sql(`SELECT pp.*,c.name as client_name,c.logo_url,c.num_employeur,c.nif,c.bp,c.phone as client_phone,c.entite_name FROM payroll_periods pp JOIN clients c ON pp.client_id=c.id WHERE pp.id=$1 AND c.organization_id=$2`, [id, auth.orgId])
        if (!r.rows.length) return res.status(404).json({ error: 'Période introuvable' })
        return res.status(200).json(r.rows[0])
      }
      if (req.method === 'PATCH') {
        const body = req.body
        const keys = Object.keys(body)
        const sets = keys.map((k,i) => `${k}=$${i+1}`).join(', ')
        const vals = [...Object.values(body), id]
        const r = await sql(`UPDATE payroll_periods SET ${sets},updated_at=NOW() WHERE id=$${vals.length} RETURNING *`, vals)
        return res.status(200).json(r.rows[0])
      }
    } else {
      if (req.method === 'GET') {
        const clientId = req.query?.client_id
        let q = `SELECT pp.*,c.name as client_name FROM payroll_periods pp JOIN clients c ON pp.client_id=c.id WHERE c.organization_id=$1`
        const p = [auth.orgId]
        if (clientId) { q += ' AND pp.client_id=$2'; p.push(clientId) }
        q += ' ORDER BY pp.period_year DESC,pp.period_month DESC'
        const r = await sql(q, p)
        return res.status(200).json(r.rows)
      }
      if (req.method === 'POST') {
        const { client_id, period_month, period_year } = req.body
        const ex = await sql('SELECT id FROM payroll_periods WHERE client_id=$1 AND period_year=$2 AND period_month=$3', [client_id, period_year, period_month])
        if (ex.rows.length) return res.status(409).json({ error: 'Période déjà existante' })
        const r = await sql('INSERT INTO payroll_periods (client_id,period_month,period_year,status) VALUES ($1,$2,$3,$4) RETURNING *', [client_id, period_month, period_year, 'open'])
        return res.status(201).json(r.rows[0])
      }
    }
    return res.status(405).end()
  } catch (e) { return res.status(500).json({ error: e.message }) }
}
