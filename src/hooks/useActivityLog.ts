import { activityApi } from '../lib/api'

export async function logActivity(_orgId: string, _userId: string, action: string, details?: string) {
  try { await activityApi.log(action, details) } catch {}
}
