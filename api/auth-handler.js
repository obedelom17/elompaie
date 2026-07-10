import { getAuth } from './_auth.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  try {
    const auth = getAuth()
    return auth.handler(req, res)
  } catch (e) {
    console.error('[auth handler error]', e.message)
    return res.status(500).json({ error: e.message })
  }
}
