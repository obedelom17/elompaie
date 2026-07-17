export const config = { runtime: 'nodejs' }

const NEON_AUTH_BASE_URL = process.env.NEON_AUTH_BASE_URL
const APP_URL = process.env.BETTER_AUTH_URL || 'https://elompaie.vercel.app'

export default async function handler(req, res) {
  if (!NEON_AUTH_BASE_URL) return res.status(500).json({ error: 'NEON_AUTH_BASE_URL non configuré' })

  const subpath = req.url.replace(/^\/api\/neon-auth/, '')
  const url = `${NEON_AUTH_BASE_URL}${subpath}`

  let body = undefined
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const parsed = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    if (!parsed.callbackURL) parsed.callbackURL = `${APP_URL}/`
    body = JSON.stringify(parsed)
  }

  const headers = {
    'origin': APP_URL,
    'referer': `${APP_URL}/`,
    'content-type': 'application/json',
  }
  if (req.headers['cookie']) headers['cookie'] = req.headers['cookie']
  if (req.headers['authorization']) headers['authorization'] = req.headers['authorization']
  if (req.headers['x-forwarded-for']) headers['x-forwarded-for'] = req.headers['x-forwarded-for']

  let upstreamRes
  try {
    upstreamRes = await fetch(url, {
      method: req.method,
      headers,
      body,
      signal: AbortSignal.timeout(15000),
    })
  } catch (e) {
    return res.status(502).json({ error: `Proxy error: ${e.message}` })
  }

  // Node 18+ fetch: getSetCookie() retourne toutes les cookies correctement
  // Réécrire pour poser le cookie sur notre domaine
  const setCookies = upstreamRes.headers.getSetCookie
    ? upstreamRes.headers.getSetCookie()
    : [upstreamRes.headers.get('set-cookie')].filter(Boolean)

  const rewrittenCookies = setCookies.map(cookie =>
    cookie
      .replace(/Domain=[^;]+;?\s*/gi, '')        // retirer Domain= original
      .replace(/SameSite=None/gi, 'SameSite=Lax') // SameSite=Lax pour same-origin
      .replace(/;\s*Secure/gi, '; Secure')         // garder Secure (HTTPS Vercel)
  )

  // Transmettre tous les autres headers
  for (const [key, value] of upstreamRes.headers.entries()) {
    const lk = key.toLowerCase()
    if (['set-cookie', 'transfer-encoding', 'connection', 'content-encoding'].includes(lk)) continue
    try { res.setHeader(key, value) } catch {}
  }

  if (rewrittenCookies.length > 0) {
    res.setHeader('set-cookie', rewrittenCookies)
  }

  res.status(upstreamRes.status)
  const respBody = await upstreamRes.text()
  res.send(respBody)
}
