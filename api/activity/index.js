import { sql } from '../_db.js'
import { requireAuth } from '../_auth.js'
export const config = { runtime: 'edge' }
export default async function handler(req) {
  try {
    const auth = await requireAuth(req)
    if (req.method === 'GET') {
      const res = await sql('SELECT * FROM activity_logs WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 100', [auth.orgId])
      return new Response(JSON.stringify(res.rows), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    if (req.method === 'POST') {
      const { action, details } = await req.json()
      await sql('INSERT INTO activity_logs (organization_id, user_id, action, details) VALUES ($1,$2,$3,$4)', [auth.orgId, auth.userId, action, details||null])
      return new Response(JSON.stringify({ ok: true }), { status: 201, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response('Method Not Allowed', { status: 405 })
  } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500 }) }
}
