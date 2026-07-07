import { sql } from '../_db.js'
import { requireAuth } from '../_auth.js'
export const config = { runtime: 'edge' }
export default async function handler(req) {
  try {
    const auth = await requireAuth(req)
    const url = new URL(req.url)
    if (req.method === 'GET') {
      const clientId = url.searchParams.get('client_id')
      let query = `SELECT pp.*, c.name as client_name FROM payroll_periods pp JOIN clients c ON pp.client_id = c.id WHERE c.organization_id = $1`
      const params = [auth.orgId]
      if (clientId) { query += ' AND pp.client_id = $2'; params.push(clientId) }
      query += ' ORDER BY pp.period_year DESC, pp.period_month DESC'
      const res = await sql(query, params)
      return new Response(JSON.stringify(res.rows), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    if (req.method === 'POST') {
      const { client_id, period_month, period_year } = await req.json()
      const existing = await sql('SELECT id FROM payroll_periods WHERE client_id=$1 AND period_year=$2 AND period_month=$3', [client_id, period_year, period_month])
      if (existing.rows.length) return new Response(JSON.stringify({ error: 'Période déjà existante' }), { status: 409 })
      const res = await sql('INSERT INTO payroll_periods (client_id, period_month, period_year, status) VALUES ($1,$2,$3,$4) RETURNING *', [client_id, period_month, period_year, 'open'])
      return new Response(JSON.stringify(res.rows[0]), { status: 201, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response('Method Not Allowed', { status: 405 })
  } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500 }) }
}
