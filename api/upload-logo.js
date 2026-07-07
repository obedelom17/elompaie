import { requireAuth } from './_auth.js'
export const config = { runtime: 'edge' }
export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })
  try {
    await requireAuth(req)
    const formData = await req.formData()
    const file = formData.get('file')
    if (!file) return new Response(JSON.stringify({ error: 'Fichier manquant' }), { status: 400 })
    const bytes = await file.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)))
    const dataUri = `data:${file.type};base64,${base64}`
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET
    const timestamp = Math.floor(Date.now() / 1000)
    const toSign = `folder=elompaie-logos&timestamp=${timestamp}${apiSecret}`
    const msgBuf = new TextEncoder().encode(toSign)
    const hashBuf = await crypto.subtle.digest('SHA-1', msgBuf)
    const signature = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')
    const form = new FormData()
    form.append('file', dataUri)
    form.append('api_key', apiKey)
    form.append('timestamp', timestamp)
    form.append('folder', 'elompaie-logos')
    form.append('signature', signature)
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: form })
    const data = await res.json()
    if (data.error) return new Response(JSON.stringify({ error: data.error.message }), { status: 500 })
    return new Response(JSON.stringify({ url: data.secure_url }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500 }) }
}
