import { neon } from '@neondatabase/serverless'

const NEON_AUTH_BASE_URL = process.env.NEON_AUTH_BASE_URL

export async function requireAuth(req) {
  // Extraire le cookie better-auth.session_token
  const cookieHeader = req.headers?.cookie || ''
  if (!cookieHeader) throw new Error('Non authentifié')

  // Valider la session auprès de Neon Auth
  const sessionRes = await fetch(`${NEON_AUTH_BASE_URL}/get-session`, {
    headers: { cookie: cookieHeader },
    signal: AbortSignal.timeout(5000),
  })

  if (!sessionRes.ok) throw new Error('Non authentifié')

  const session = await sessionRes.json()
  const userId = session?.user?.id
  if (!userId) throw new Error('Non authentifié')

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
