import { neon } from '@neondatabase/serverless'

// Nouvelle connexion à chaque invocation (serverless-safe)
function getSql() {
  return neon(process.env.DATABASE_URL)
}

export async function sql(query, params = []) {
  const db = getSql()
  const rows = await db(query, params)
  return { rows: Array.isArray(rows) ? rows : [], rowCount: rows?.length || 0 }
}
