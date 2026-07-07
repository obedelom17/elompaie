import { sql } from '../_db.js'
import { verifyPassword, signJWT } from '../_auth.js'
export const config = { runtime: 'edge' }
export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })
  try {
    const { email, password } = await req.json()
    const res = await sql(`SELECT u.id, u.email, u.password_hash, o.id as org_id, o.name as org_name FROM users u JOIN organizations o ON u.organization_id = o.id WHERE u.email = $1`, [email.toLowerCase()])
    if (res.rows.length === 0) return new Response(JSON.stringify({ error: 'Email ou mot de passe incorrect' }), { status: 401 })
    const user = res.rows[0]
    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) return new Response(JSON.stringify({ error: 'Email ou mot de passe incorrect' }), { status: 401 })
    const token = await signJWT({ userId: user.id, email: user.email, orgId: user.org_id, orgName: user.org_name })
    return new Response(JSON.stringify({ token, user: { id: user.id, email: user.email }, org: { id: user.org_id, name: user.org_name } }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500 }) }
}
