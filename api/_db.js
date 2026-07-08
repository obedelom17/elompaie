import { neon } from '@neondatabase/serverless'

let _sql = null

export function sql(query, params = []) {
  if (!_sql) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL manquant')
    _sql = neon(process.env.DATABASE_URL)
  }
  return _sql(query, params).then(rows => ({ rows, rowCount: rows.length }))
}
