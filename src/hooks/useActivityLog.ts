import { activityApi } from '../lib/api'

export async function logActivity(action: string, details?: string): Promise<void> {
  try { await activityApi.log({ action, details }) } catch {}
}
