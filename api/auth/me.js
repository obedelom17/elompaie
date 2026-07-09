import { requireAuth } from '../_auth.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  try {
    const auth = await requireAuth(req)
    return res.status(200).json({ userId: auth.userId, email: auth.email, org: auth.orgId ? { id: auth.orgId, name: auth.orgName } : null })
  } catch (e) {
    return res.status(401).json({ error: e.message })
  }
}
