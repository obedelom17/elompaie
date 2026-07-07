import { sql } from '../_db.js'
import { requireAuth } from '../_auth.js'
export const config = { runtime: 'edge' }
export default async function handler(req, { params }) {
  try {
    const auth = await requireAuth(req)
    const id = params?.id || req.url.split('/').pop().split('?')[0]
    if (req.method === 'GET') {
      const res = await sql(`SELECT pp.*, c.name as client_name, c.logo_url, c.num_employeur, c.nif, c.bp, c.phone as client_phone, c.entite_name FROM payroll_periods pp JOIN clients c ON pp.client_id = c.id WHERE pp.id = $1 AND c.organization_id = $2`, [id, auth.orgId])
      if (!res.rows.length) return new Response(JSON.stringify({ error: 'Période introuvable' }), { status: 404 })
      return new Response(JSON.stringify(res.rows[0]), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    if (req.method === 'PATCH') {
      const body = await req.json()
      const sets = Object.keys(body).map((k, i) => `${k}=$${i + 1}`).join(', ')
      const vals = [...Object.values(body), id]
      const res = await sql(`UPDATE payroll_periods SET ${sets}, updated_at=NOW() WHERE id=$${vals.length} RETURNING *`, vals)
      return new Response(JSON.stringify(res.rows[0]), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response('Method Not Allowed', { status: 405 })
  } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500 }) }
}
