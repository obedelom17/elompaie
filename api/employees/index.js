import { sql } from '../_db.js'
import { requireAuth } from '../_auth.js'
export const config = { runtime: 'edge' }
export default async function handler(req) {
  try {
    const auth = await requireAuth(req)
    const url = new URL(req.url)
    if (req.method === 'GET') {
      const clientId = url.searchParams.get('client_id')
      let query = `SELECT e.*, c.name as client_name FROM employees e JOIN clients c ON e.client_id = c.id WHERE c.organization_id = $1`
      const params = [auth.orgId]
      if (clientId) { query += ' AND e.client_id = $2'; params.push(clientId) }
      query += ' ORDER BY e.last_name'
      const res = await sql(query, params)
      return new Response(JSON.stringify(res.rows), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    if (req.method === 'POST') {
      const b = await req.json()
      const res = await sql(
        `INSERT INTO employees (client_id, matricule, first_name, last_name, gender, birth_date, hire_date, position, category, marital_status, children_count, social_security_number, phone, email, active, status, contract_type, contract_end_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
        [b.client_id, b.matricule||null, b.first_name, b.last_name, b.gender||'M', b.birth_date||null, b.hire_date||null, b.position||null, b.category||null, b.marital_status||'celibataire', b.children_count||0, b.social_security_number||null, b.phone||null, b.email||null, b.active!==false, b.status||'actif', b.contract_type||'cdi', b.contract_end_date||null]
      )
      return new Response(JSON.stringify(res.rows[0]), { status: 201, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response('Method Not Allowed', { status: 405 })
  } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500 }) }
}
