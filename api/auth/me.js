import { neon } from '@neondatabase/serverless'

const NEON_AUTH_BASE_URL = process.env.NEON_AUTH_BASE_URL
export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  try {
    if (!NEON_AUTH_BASE_URL) throw new Error('NEON_AUTH_BASE_URL non configuré')

    const cookieHeader = req.headers?.cookie || ''
    if (!cookieHeader) return res.status(401).json({ error: 'Non authentifié' })

    const sessionRes = await fetch(`${NEON_AUTH_BASE_URL}/get-session`, {
      headers: { cookie: cookieHeader },
      signal: AbortSignal.timeout(5000),
    })
    if (!sessionRes.ok) return res.status(401).json({ error: 'Session invalide' })

    const session = await sessionRes.json()
    const userId = session?.user?.id
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL)

    const rows = await sql`
      SELECT up.organization_id, o.name as org_name
      FROM user_profiles up
      LEFT JOIN organizations o ON o.id = up.organization_id
      WHERE up.user_id = ${userId}
    `

    const row = rows[0]
    return res.status(200).json({
      userId,
      email: session.user.email,
      org: row?.organization_id
        ? { id: row.organization_id.toString(), name: row.org_name }
        : null,
    })
  } catch (e) {
    console.error('[me]', e.message)
    return res.status(500).json({ error: e.message })
  }
}
