import { sql } from '../_db.js'
import { requireAuth } from '../_auth.js'
export const config = { runtime: 'edge' }
export default async function handler(req) {
  try {
    const auth = await requireAuth(req)
    if (req.method === 'GET') {
      const res = await sql('SELECT * FROM clients WHERE organization_id = $1 ORDER BY name', [auth.orgId])
      return new Response(JSON.stringify(res.rows), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    if (req.method === 'POST') {
      const body = await req.json()
      const { name, address, phone, email, ifu, rccm, sector, num_employeur, nif, bp, entite_name, logo_url } = body
      const res = await sql(
        `INSERT INTO clients (organization_id, name, address, phone, email, ifu, rccm, sector, num_employeur, nif, bp, entite_name, logo_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [auth.orgId, name, address||null, phone||null, email||null, ifu||null, rccm||null, sector||null, num_employeur||null, nif||null, bp||null, entite_name||null, logo_url||null]
      )
      return new Response(JSON.stringify(res.rows[0]), { status: 201, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response('Method Not Allowed', { status: 405 })
  } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: e.message.includes('auth') ? 401 : 500 }) }
}
