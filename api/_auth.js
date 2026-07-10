import { betterAuth } from 'better-auth'
import { Pool } from '@neondatabase/serverless'
import { PostgresDialect } from 'kysely'

let _auth = null

export function getAuth() {
  if (_auth) return _auth

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  _auth = betterAuth({
    database: new PostgresDialect({ pool }),
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
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session?.user?.id) throw new Error('Non authentifié')

  const { neon } = await import('@neondatabase/serverless')
  const sql = neon(process.env.DATABASE_URL)

  const rows = await sql`
    SELECT u.id, u.email, u.organization_id, o.name as org_name
    FROM "user" u
    LEFT JOIN organizations o ON u.organization_id::uuid = o.id
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
