import { getAuth } from './_auth.js'
import { toNodeHandler } from 'better-auth/integrations/node'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  try {
    const auth = getAuth()
    return toNodeHandler(auth)(req, res)
  } catch (e) {
    console.error('[auth handler error]', e.message)
    res.status(500).json({ error: e.message })
  }
}
