import { neon } from '@neondatabase/serverless'

let _sql = null

function getSql() {
  if (!_sql) _sql = neon(process.env.DATABASE_URL)
  return _sql
}

export async function sql(query, params = []) {
  const db = getSql()
  const rows = await db(query, params)
  return { rows: Array.isArray(rows) ? rows : [], rowCount: rows?.length || 0 }
}
