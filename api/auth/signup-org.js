import { requireAuth } from '../_auth.js'
import { neon } from '@neondatabase/serverless'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  try {
    const auth = await requireAuth(req)
    const { orgName } = req.body
    if (!orgName?.trim()) return res.status(400).json({ error: 'orgName requis' })

    const sql = neon(process.env.DATABASE_URL)

    // Org existante
    if (auth.orgId) {
      const orgs = await sql`SELECT id::text, name FROM organizations WHERE id::text = ${auth.orgId}`
      if (orgs.length) return res.status(200).json({ ok: true, org: { id: orgs[0].id, name: orgs[0].name } })
    }

    // Créer organisation
    const orgs = await sql`INSERT INTO organizations (name) VALUES (${orgName.trim()}) RETURNING id::text, name`
    const org = orgs[0]

    // Lier user → org (organization_id est TEXT dans "user" Better Auth)
    await sql`UPDATE "user" SET "organization_id" = ${org.id} WHERE id = ${auth.userId}`

    return res.status(200).json({ ok: true, org })
  } catch (e) {
    console.error('[signup-org]', e)
    return res.status(e.message.includes('auth') ? 401 : 500).json({ error: e.message })
  }
}
