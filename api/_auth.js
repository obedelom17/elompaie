import { betterAuth } from 'better-auth'
import { neon } from '@neondatabase/serverless'

let _auth = null

export function getAuth() {
  if (_auth) return _auth
  _auth = betterAuth({
    database: {
      type: 'postgresql',
      url: process.env.DATABASE_URL,
    },
    emailAndPassword: { enabled: true },
    trustedOrigins: [
      'https://elompaie.vercel.app',
      'http://localhost:5173',
    ],
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL || 'https://elompaie.vercel.app',
  })
  return _auth
}

export async function requireAuth(req) {
  const auth = getAuth()
  // Better Auth vérifie le cookie de session automatiquement
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session?.user?.id) throw new Error('Non authentifié')

  const sql = neon(process.env.DATABASE_URL)
  const rows = await sql`
    SELECT u.id, u.email, u.organization_id, o.name as org_name
    FROM "user" u
    LEFT JOIN organizations o ON u.organization_id = o.id
    WHERE u.id = ${session.user.id}
  `
  if (!rows.length) return { userId: session.user.id, email: session.user.email, orgId: null, orgName: null }

  return {
    userId: rows[0].id,
    email: rows[0].email,
    orgId: rows[0].organization_id,
    orgName: rows[0].org_name,
  }
}
