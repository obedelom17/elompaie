import * as jose from 'jose'
import { sql } from './_db.js'

const getJWKS = (() => {
  let jwks = null
  return () => {
    if (!jwks) jwks = jose.createRemoteJWKSet(new URL(`${process.env.NEON_AUTH_BASE_URL}/.well-known/jwks.json`))
    return jwks
  }
})()

export async function requireAuth(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Non authentifié')

  const token = authHeader.slice(7)
  const { payload } = await jose.jwtVerify(token, getJWKS())
  const userId = payload.sub
  if (!userId) throw new Error('Token invalide')

  const res = await sql(
    `SELECT u.id, u.email, u.organization_id, o.name as org_name
     FROM neon_auth.users_sync u
     LEFT JOIN organizations o ON u.organization_id = o.id
     WHERE u.id = $1`,
    [userId]
  )

  if (!res.rows.length) {
    // User existe dans Neon Auth mais pas encore en DB → retourner sans org
    return { userId, email: payload.email, orgId: null, orgName: null }
  }

  const row = res.rows[0]
  return {
    userId: row.id,
    email: row.email,
    orgId: row.organization_id,
    orgName: row.org_name,
  }
}
