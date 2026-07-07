/**
 * Auth helpers : JWT sign/verify (Web Crypto API — compatible Edge)
 */

const SECRET = process.env.JWT_SECRET || 'changeme-32chars-minimum-secret!'

async function getKey(usage) {
  const enc = new TextEncoder()
  return crypto.subtle.importKey(
    'raw', enc.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false, [usage]
  )
}

export async function signJWT(payload) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 }))
  const data = `${header}.${body}`
  const key = await getKey('sign')
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${data}.${sigB64}`
}

export async function verifyJWT(token) {
  try {
    const [header, body, sig] = token.split('.')
    const data = `${header}.${body}`
    const key = await getKey('verify')
    const sigBuf = Uint8Array.from(atob(sig.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
    const valid = await crypto.subtle.verify('HMAC', key, sigBuf, new TextEncoder().encode(data))
    if (!valid) return null
    const payload = JSON.parse(atob(body))
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch { return null }
}

export async function hashPassword(password) {
  // SHA-256 + salt (simple, sans bcrypt pour edge compat)
  const salt = crypto.randomUUID()
  const enc = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(salt + password))
  const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${salt}:${hash}`
}

export async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':')
  const enc = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(salt + password))
  const computed = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
  return computed === hash
}

export function getTokenFromRequest(req) {
  const auth = req.headers.get('authorization') || ''
  if (auth.startsWith('Bearer ')) return auth.slice(7)
  return null
}

export async function requireAuth(req) {
  const token = getTokenFromRequest(req)
  if (!token) throw new Error('Non authentifié')
  const payload = await verifyJWT(token)
  if (!payload) throw new Error('Token invalide ou expiré')
  return payload
}
