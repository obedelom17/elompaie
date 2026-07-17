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
      signal: AbortSignal.timeout(8000),
    })
    if (!sessionRes.ok) {
      const body = await sessionRes.text().catch(() => '')
      throw new Error(`Session invalide (${sessionRes.status})${body ? ': ' + body.substring(0, 100) : ''}`)
    }
    session = await sessionRes.json()
  } catch (e) {
    if (e.message.includes('Session invalide') || e.message.includes('Non authentifié')) throw e
    throw new Error(`Erreur auth: ${e.message}`)
  }

  const userId = session?.user?.id
  if (!userId) throw new Error('Non authentifié: session vide')

  const db = neon(process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL)

  // Auto-créer les tables si elles n'existent pas
  try {
    await db`CREATE TABLE IF NOT EXISTS organizations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`
    await db`CREATE TABLE IF NOT EXISTS user_profiles (
      user_id TEXT PRIMARY KEY,
      organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`
  } catch {}

  let row = null
  try {
    const rows = await db`
      SELECT up.organization_id, o.name as org_name
      FROM user_profiles up
      LEFT JOIN organizations o ON o.id = up.organization_id
      WHERE up.user_id = ${userId}
    `
    row = rows[0] || null
  } catch {}

  return {
    userId,
    email: session.user?.email || '',
    orgId: row?.organization_id?.toString() || null,
    orgName: row?.org_name || null,
  }
}
