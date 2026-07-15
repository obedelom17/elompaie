// Endpoint temporaire pour diagnostiquer l'état de la session et de l'org
export const config = { runtime: 'nodejs' }
import { neon } from '@neondatabase/serverless'

const NEON_AUTH_BASE_URL = process.env.NEON_AUTH_BASE_URL

export default async function handler(req, res) {
  const info = {
    env: {
      NEON_AUTH_BASE_URL: NEON_AUTH_BASE_URL ? '✓ défini' : '✗ MANQUANT',
      DATABASE_URL: process.env.DATABASE_URL ? '✓' : '✗',
      POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL ? '✓' : '✗',
    },
    cookie: req.headers?.cookie ? req.headers.cookie.substring(0, 100) + '...' : 'AUCUN COOKIE',
    session: null,
    userProfile: null,
    error: null,
  }

  try {
    const sessionRes = await fetch(`${NEON_AUTH_BASE_URL}/get-session`, {
      headers: { cookie: req.headers?.cookie || '' },
      signal: AbortSignal.timeout(5000),
    })
    info.sessionStatus = sessionRes.status
    const session = await sessionRes.json()
    info.session = session?.user ? { id: session.user.id, email: session.user.email } : null

    if (session?.user?.id) {
      const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL)
      const rows = await sql`
        SELECT up.user_id, up.organization_id, o.name as org_name
        FROM user_profiles up
        LEFT JOIN organizations o ON o.id = up.organization_id
        WHERE up.user_id = ${session.user.id}
      `
      info.userProfile = rows[0] || 'AUCUN PROFIL (user_profiles vide)'
    }
  } catch (e) {
    info.error = e.message
  }

  return res.status(200).json(info)
}
