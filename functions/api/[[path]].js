// Cloudflare Pages Function : adaptateur pour les handlers Node "style Vercel" de /api.
// Les fichiers api/*.js restent inchangés. Nécessite le flag de compatibilité `nodejs_compat`.
import { Buffer } from 'node:buffer'

function populateEnv(env) {
  for (const [k, v] of Object.entries(env || {})) {
    if (typeof v === 'string') process.env[k] = v
  }
}

async function buildReq(request, url, rewrittenUrl) {
  const headers = {}
  request.headers.forEach((v, k) => { headers[k.toLowerCase()] = v })
  const method = request.method.toUpperCase()
  let body
  if (method !== 'GET' && method !== 'HEAD') {
    const ct = headers['content-type'] || ''
    const buf = Buffer.from(await request.arrayBuffer())
    if (ct.includes('application/json')) {
      try { body = buf.length ? JSON.parse(buf.toString('utf8')) : {} } catch { body = {} }
    } else {
      body = buf
    }
  }
  return { method, url: rewrittenUrl || (url.pathname + url.search), headers, body }
}

function buildRes() {
  const headers = new Headers()
  const cookies = []
  let status = 200
  let resolve
  const done = new Promise(r => { resolve = r })
  const finish = (payload) => {
    for (const c of cookies) headers.append('set-cookie', c)
    const nullBody = status === 204 || status === 304
    resolve(new Response(nullBody ? null : payload, { status, headers }))
  }
  const res = {
    status(code) { status = code; return res },
    setHeader(k, v) {
      if (k.toLowerCase() === 'set-cookie') { cookies.push(...(Array.isArray(v) ? v : [v])) }
      else headers.set(k, Array.isArray(v) ? v.join(', ') : String(v))
      return res
    },
    getHeader(k) { return headers.get(k) },
    json(obj) { headers.set('content-type', 'application/json; charset=utf-8'); finish(JSON.stringify(obj)); return res },
    send(data) {
      if (data !== null && typeof data === 'object' && !(data instanceof Uint8Array) && !Buffer.isBuffer(data)) return res.json(data)
      if (typeof data === 'string' && !headers.has('content-type')) headers.set('content-type', 'text/html; charset=utf-8')
      finish(data ?? null); return res
    },
    end(data) { finish(data ?? null); return res },
  }
  return { res, done }
}

export async function onRequest({ request, env }) {
  populateEnv(env)
  const url = new URL(request.url)

  let handler, rewritten
  if (url.pathname === '/api/neon-auth' || url.pathname.startsWith('/api/neon-auth/')) {
    // équivalent du rewrite Vercel /api/neon-auth/:path* -> neon-auth-proxy?_subpath=
    const sub = url.pathname.replace(/^\/api\/neon-auth\/?/, '') + url.search
    rewritten = `/api/neon-auth-proxy?_subpath=${encodeURIComponent(sub)}`
    handler = (await import('../../api/neon-auth-proxy.js')).default
  } else {
    rewritten = null // index.js déduit la route depuis le chemin
    handler = (await import('../../api/index.js')).default
  }

  const req = await buildReq(request, url, rewritten)
  const { res, done } = buildRes()
  try {
    await handler(req, res)
    // sécurité : si le handler rend la main sans répondre
    res.end()
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
  return done
}
