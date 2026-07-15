export const config = { runtime: 'nodejs' }

const NEON_AUTH_BASE_URL = process.env.NEON_AUTH_BASE_URL
const APP_URL = process.env.BETTER_AUTH_URL || 'https://elompaie.vercel.app'

export default async function handler(req, res) {
  if (!NEON_AUTH_BASE_URL) return res.status(500).json({ error: 'NEON_AUTH_BASE_URL non configuré' })

  const subpath = req.url.replace(/^\/api\/neon-auth/, '')
  const url = `${NEON_AUTH_BASE_URL}${subpath}`

  // Intercepter le body pour injecter callbackURL si absent
  let body = undefined
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const parsed = req.body || {}
    if (!parsed.callbackURL) {
      parsed.callbackURL = `${APP_URL}/auth`
    }
    body = JSON.stringify(parsed)
  }

  const headers = {
    // Origin requis par Neon Auth
    'origin': APP_URL,
    'referer': `${APP_URL}/`,
  }
  if (req.headers['content-type']) headers['content-type'] = req.headers['content-type']
  if (req.headers['cookie']) headers['cookie'] = req.headers['cookie']
  if (req.headers['authorization']) headers['authorization'] = req.headers['authorization']

  const upstreamRes = await fetch(url, {
    method: req.method,
    headers,
    body,
    signal: AbortSignal.timeout(10000),
  })

  // Transmettre Set-Cookie en réécrivant le domaine
  const setCookieHeaders = []
  for (const [key, value] of upstreamRes.headers.entries()) {
    if (key.toLowerCase() === 'set-cookie') {
      const rewritten = value
        .replace(/Domain=[^;]+;?\s*/gi, '')
        .replace(/SameSite=None/gi, 'SameSite=Lax')
      setCookieHeaders.push(rewritten)
    } else if (!['transfer-encoding', 'connection', 'content-encoding'].includes(key.toLowerCase())) {
      res.setHeader(key, value)
    }
  }
  if (setCookieHeaders.length) res.setHeader('set-cookie', setCookieHeaders)

  res.status(upstreamRes.status)
  const respBody = await upstreamRes.text()
  res.send(respBody)
}
