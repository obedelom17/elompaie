import { t } from '../lib/i18n'
const BASE = '/api'

export async function apiFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, { credentials: 'include', ...opts })
  if (res.status === 401) {
    // Session expirée → rediriger vers /auth
    window.location.href = '/auth'
    throw new Error(t("Session expirée"))
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// Cache mémoire des lectures : revenir sur une page déjà visitée est instantané.
// Toute écriture (POST, PUT, PATCH, DELETE) vide le cache pour éviter les données périmées.
const CACHE_TTL_MS = 60_000
const cache = new Map<string, { at: number; data: unknown }>()
const inflight = new Map<string, Promise<unknown>>()

export function clearApiCache() { cache.clear(); inflight.clear() }

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const isRead = method === 'GET'
  if (isRead) {
    const hit = cache.get(path)
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return structuredClone(hit.data) as T
    const pending = inflight.get(path)
    if (pending) return structuredClone(await pending) as T
  } else {
    clearApiCache()
  }

  const run = (async () => {
    const res = await fetch(`${BASE}${path}`, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
    if (res.status === 401) {
      clearApiCache()
      window.location.href = '/auth'
      throw new Error(t("Session expirée"))
    }
    const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
    return data
  })()

  if (!isRead) return (await run) as T
  inflight.set(path, run)
  try {
    const data = await run
    cache.set(path, { at: Date.now(), data })
    return structuredClone(data) as T
  } finally {
    inflight.delete(path)
  }
}

export const clientsApi = {
  list:   ()              => request<any[]>('GET',  '/clients'),
  get:    (id: string)    => request<any>  ('GET',  `/clients?id=${id}`),
  create: (d: any)        => request<any>  ('POST', '/clients', d),
  update: (id: string, d: any) => request<any>('PUT', `/clients?id=${id}`, d),
  delete: (id: string)    => request<any>  ('DELETE', `/clients?id=${id}`),
}

export const employeesApi = {
  list:   (clientId?: string) => request<any[]>('GET', `/employees${clientId ? `?client_id=${clientId}` : ''}`),
  get:    (id: string)        => request<any>  ('GET', `/employees?id=${id}`),
  create: (d: any)            => request<any>  ('POST', '/employees', d),
  update: (id: string, d: any) => request<any>('PUT', `/employees?id=${id}`, d),
  delete: (id: string)        => request<any>  ('DELETE', `/employees?id=${id}`),
}

export const payrollApi = {
  listPeriods: (clientId?: string) => request<any[]>('GET', `/payroll${clientId ? `?client_id=${clientId}` : ''}`),
  getPeriod:   (id: string)        => request<any>  ('GET', `/payroll?id=${id}`),
  createPeriod: (d: any)           => request<any>  ('POST', '/payroll', d),
  updatePeriod: (id: string, d: any) => request<any>('PATCH', `/payroll?id=${id}`, d),
  listVariables: (periodId: string, empId?: string) =>
    request<any[]>('GET', `/payroll-variables?period_id=${periodId}${empId ? `&employee_id=${empId}` : ''}`),
  saveVariables: (d: any) => request<any>('POST', '/payroll-variables', d),
}

export const salaryGridsApi = {
  list:   ()             => request<any[]>('GET',    '/salary-grids'),
  create: (d: any)       => request<any>  ('POST',   '/salary-grids', d),
  update: (id: string, d: any) => request<any>('PUT', `/salary-grids?id=${id}`, d),
  delete: (id: string)   => request<any>  ('DELETE', `/salary-grids?id=${id}`),
}

export const activityApi = {
  list:   ()       => request<any[]>('GET',  '/activity'),
  log:    (d: any) => request<any>  ('POST', '/activity', d),
}

export async function uploadLogo(file: File): Promise<string> {
  const res = await fetch('/api/upload-logo', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'x-content-type': file.type,
      'x-filename': file.name,
    },
    body: file,
  })
  if (res.status === 401) { window.location.href = '/auth'; throw new Error(t("Session expirée")) }
  if (!res.ok) throw new Error(t("Erreur upload logo"))
  const data = await res.json()
  return data.url
}
