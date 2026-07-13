import { betterAuth } from 'better-auth'
import { fromNodeHeaders } from 'better-auth/integrations/node'
import { neon } from '@neondatabase/serverless'

let _auth = null

export function getAuth() {
  if (_auth) return _auth

  _auth = betterAuth({
    database: {
      type: 'postgresql',
      url: process.env.DATABASE_URL,
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    trustedOrigins: [
      process.env.BETTER_AUTH_URL || 'https://elompaie.vercel.app',
      'http://localhost:5173',
      'http://localhost:3000',
    ],
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL || 'https://elompaie.vercel.app',
    user: {
      additionalFields: {
        organization_id: {
          type: 'string',
          required: false,
          defaultValue: null,
        }
      }
    }
  })
  return _auth
}

export async function requireAuth(req) {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) })
  if (!session?.user?.id) throw new Error('Non authentifié')

  const sql = neon(process.env.DATABASE_URL)

  const rows = await sql`
    SELECT u.id, u.email, u.organization_id, o.name as org_name
    FROM "user" u
    LEFT JOIN organizations o ON o.id::text = u.organization_id
    WHERE u.id = ${session.user.id}
  `

  const row = rows[0]
  return {
    userId: session.user.id,
    email: session.user.email,
    orgId: row?.organization_id || null,
    orgName: row?.org_name || null,
  }
}
