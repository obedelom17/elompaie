import { requireAuth } from '../_auth.js'
import { sql } from '../_db.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  try {
    const auth = await requireAuth(req)
    const { orgName } = req.body
    if (!orgName) return res.status(400).json({ error: 'orgName requis' })

    // Vérifier si org déjà liée
    const existing = await sql(
      'SELECT organization_id FROM neon_auth.users_sync WHERE id = $1',
      [auth.userId]
    )
    if (existing.rows[0]?.organization_id) {
      const org = await sql('SELECT id, name FROM organizations WHERE id = $1', [existing.rows[0].organization_id])
      return res.status(200).json({ ok: true, org: org.rows[0] })
    }

    // Créer organisation
    const orgRes = await sql(
      'INSERT INTO organizations (name) VALUES ($1) RETURNING id, name',
      [orgName.trim()]
    )
    const org = orgRes.rows[0]

    // Lier user → org
    await sql(
      'UPDATE neon_auth.users_sync SET organization_id = $1 WHERE id = $2',
      [org.id, auth.userId]
    )

    return res.status(200).json({ ok: true, org })
  } catch (e) {
    return res.status(e.message.includes('auth') ? 401 : 500).json({ error: e.message })
  }
}
