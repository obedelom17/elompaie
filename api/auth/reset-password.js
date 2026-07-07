import { sql } from '../_db.js'
export const config = { runtime: 'edge' }
export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })
  try {
    const { email } = await req.json()
    await sql('SELECT id FROM users WHERE email = $1', [email.toLowerCase()])
    // TODO: envoyer email reset via Resend
    return new Response(JSON.stringify({ message: 'Si cet email existe, un lien a été envoyé.' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500 }) }
}
