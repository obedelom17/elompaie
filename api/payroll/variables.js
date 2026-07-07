import { sql } from '../_db.js'
import { requireAuth } from '../_auth.js'
export const config = { runtime: 'edge' }
export default async function handler(req) {
  try {
    const auth = await requireAuth(req)
    const url = new URL(req.url)
    const periodId = url.searchParams.get('period_id')
    const employeeId = url.searchParams.get('employee_id')
    if (req.method === 'GET') {
      let query = `SELECT pv.*, e.first_name, e.last_name, e.matricule, e.position, e.category, e.marital_status, e.children_count FROM payroll_variables pv JOIN employees e ON pv.employee_id = e.id WHERE pv.period_id = $1`
      const params = [periodId]
      if (employeeId) { query += ' AND pv.employee_id = $2'; params.push(employeeId) }
      const res = await sql(query, params)
      return new Response(JSON.stringify(res.rows), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    if (req.method === 'POST' || req.method === 'PUT') {
      const b = await req.json()
      const existing = await sql('SELECT id FROM payroll_variables WHERE period_id=$1 AND employee_id=$2', [b.period_id, b.employee_id])
      let res
      if (existing.rows.length) {
        const { period_id, employee_id, ...rest } = b
        const keys = Object.keys(rest)
        const sets = keys.map((k, i) => `${k}=$${i+1}`).join(', ')
        const vals = [...Object.values(rest), existing.rows[0].id]
        res = await sql(`UPDATE payroll_variables SET ${sets}, updated_at=NOW() WHERE id=$${vals.length} RETURNING *`, vals)
      } else {
        const keys = Object.keys(b)
        const placeholders = keys.map((_, i) => `$${i+1}`).join(', ')
        res = await sql(`INSERT INTO payroll_variables (${keys.join(',')}) VALUES (${placeholders}) RETURNING *`, Object.values(b))
      }
      return new Response(JSON.stringify(res.rows[0]), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response('Method Not Allowed', { status: 405 })
  } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500 }) }
}
