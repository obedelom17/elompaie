import { sql } from './_db.js'
import { requireAuth } from './_auth.js'
export const config = { runtime: 'nodejs' }
export default async function handler(req, res) {
  try {
    const auth = await requireAuth(req)
    const id = req.query?.id
    if (id) {
      if (req.method === 'PUT') {
        const b = req.body
        const r = await sql('UPDATE salary_grids SET category=$1,echelon=$2,base_salary=$3,hourly_rate=$4 WHERE id=$5 RETURNING *', [b.category,b.echelon,b.base_salary,b.hourly_rate,id])
        return res.status(200).json(r.rows[0])
      }
      if (req.method === 'DELETE') {
        await sql('DELETE FROM salary_grids WHERE id=$1', [id])
        return res.status(200).json({ ok: true })
      }
    } else {
      if (req.method === 'GET') {
        const r = await sql(`SELECT sg.*,c.name as client_name FROM salary_grids sg JOIN clients c ON sg.client_id=c.id WHERE c.organization_id=$1 ORDER BY sg.category,sg.echelon`, [auth.orgId])
        return res.status(200).json(r.rows)
      }
      if (req.method === 'POST') {
        const b = req.body
        const r = await sql('INSERT INTO salary_grids (client_id,category,echelon,base_salary,hourly_rate) VALUES ($1,$2,$3,$4,$5) RETURNING *', [b.client_id,b.category,b.echelon||1,b.base_salary||0,b.hourly_rate||0])
        return res.status(201).json(r.rows[0])
      }
    }
    return res.status(405).end()
  } catch (e) { return res.status(500).json({ error: e.message }) }
}
