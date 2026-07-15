import { neon } from '@neondatabase/serverless'

const NEON_AUTH_BASE_URL = process.env.NEON_AUTH_BASE_URL

export async function requireAuth(req) {
  if (!NEON_AUTH_BASE_URL) throw new Error('NEON_AUTH_BASE_URL non configuré')

  const cookieHeader = req.headers?.cookie || ''
  if (!cookieHeader) throw new Error('Non authentifié: pas de cookie')

  let session
  try {
    const sessionRes = await fetch(`${NEON_AUTH_BASE_URL}/get-session`, {
      headers: { cookie: cookieHeader },
      signal: AbortSignal.timeout(5000),
    })
    if (!sessionRes.ok) {
      const body = await sessionRes.text()
      throw new Error(`Session invalide (${sessionRes.status}): ${body}`)
    }
    session = await sessionRes.json()
  } catch (e) {
    throw new Error(`Erreur auth: ${e.message}`)
  }

  const userId = session?.user?.id
  if (!userId) throw new Error('Non authentifié: session vide')

  const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL)

  const rows = await sql`
    SELECT up.organization_id, o.name as org_name
    FROM user_profiles up
    LEFT JOIN organizations o ON o.id = up.organization_id
    WHERE up.user_id = ${userId}
  `

  const row = rows[0]
  return {
    userId,
    email: session.user.email || '',
    orgId: row?.organization_id?.toString() || null,
    orgName: row?.org_name || null,
  }
}
