/**
 * Neon HTTP API helper
 * Fonctionne dans Vercel Edge Functions (pas de pg natif nécessaire)
 */
export async function sql(query, params = []) {
  const connStr = process.env.DATABASE_URL
  if (!connStr) throw new Error('DATABASE_URL manquant')

  // Parse postgresql://user:pass@host/db
  const match = connStr.replace('?sslmode=require', '').match(/postgresql:\/\/([^:]+):([^@]+)@([^/]+)\/(.+)/)
  if (!match) throw new Error('DATABASE_URL invalide')
  const [, user, password, host, db] = match

  const res = await fetch(`https://${host}/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + btoa(`${user}:${password}`),
    },
    body: JSON.stringify({ query, params }),
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Neon error ${res.status}: ${txt}`)
  }

  const data = await res.json()
  return {
    rows: data.rows || [],
    rowCount: data.rowCount || 0,
  }
}
