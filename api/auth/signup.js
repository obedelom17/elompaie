import { sql } from '../_db.js'
import { hashPassword, signJWT } from '../_auth.js'
export const config = { runtime: 'edge' }
export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })
  try {
    const { email, password, orgName } = await req.json()
    if (!email || !password || !orgName) return new Response(JSON.stringify({ error: 'Champs requis manquants' }), { status: 400 })
    if (password.length < 6) return new Response(JSON.stringify({ error: 'Mot de passe: 6 caractères minimum' }), { status: 400 })
    const existing = await sql('SELECT id FROM users WHERE email = $1', [email.toLowerCase()])
    if (existing.rows.length > 0) return new Response(JSON.stringify({ error: 'Email déjà utilisé' }), { status: 409 })
    const orgRes = await sql('INSERT INTO organizations (name) VALUES ($1) RETURNING id, name', [orgName.trim()])
    const org = orgRes.rows[0]
    const hashed = await hashPassword(password)
    const userRes = await sql('INSERT INTO users (email, password_hash, organization_id) VALUES ($1, $2, $3) RETURNING id, email', [email.toLowerCase(), hashed, org.id])
    const user = userRes.rows[0]
    const token = await signJWT({ userId: user.id, email: user.email, orgId: org.id, orgName: org.name })
    return new Response(JSON.stringify({ token, user: { id: user.id, email: user.email }, org }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500 }) }
}
