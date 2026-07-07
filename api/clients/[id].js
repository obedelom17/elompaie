import { sql } from '../_db.js'
import { requireAuth } from '../_auth.js'
export const config = { runtime: 'edge' }
export default async function handler(req, { params }) {
  try {
    const auth = await requireAuth(req)
    const id = params?.id || req.url.split('/').pop().split('?')[0]
    if (req.method === 'GET') {
      const res = await sql('SELECT * FROM clients WHERE id = $1 AND organization_id = $2', [id, auth.orgId])
      if (!res.rows.length) return new Response(JSON.stringify({ error: 'Client introuvable' }), { status: 404 })
      return new Response(JSON.stringify(res.rows[0]), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    if (req.method === 'PUT' || req.method === 'PATCH') {
      const body = await req.json()
      const { name, address, phone, email, ifu, rccm, sector, num_employeur, nif, bp, entite_name, logo_url } = body
      const res = await sql(
        `UPDATE clients SET name=$1, address=$2, phone=$3, email=$4, ifu=$5, rccm=$6, sector=$7, num_employeur=$8, nif=$9, bp=$10, entite_name=$11, logo_url=$12, updated_at=NOW()
         WHERE id=$13 AND organization_id=$14 RETURNING *`,
        [name, address||null, phone||null, email||null, ifu||null, rccm||null, sector||null, num_employeur||null, nif||null, bp||null, entite_name||null, logo_url||null, id, auth.orgId]
      )
      return new Response(JSON.stringify(res.rows[0]), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    if (req.method === 'DELETE') {
      await sql('DELETE FROM clients WHERE id = $1 AND organization_id = $2', [id, auth.orgId])
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response('Method Not Allowed', { status: 405 })
  } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500 }) }
}
