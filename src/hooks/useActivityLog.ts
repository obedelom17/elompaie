import { supabase } from '../lib/supabase'

export async function logActivity(
  orgId: string,
  userId: string,
  action: string,
  details?: string
) {
  try {
    await supabase.from('activity_logs').insert({
      organization_id: orgId,
      user_id: userId,
      action,
      details: details || null,
      created_at: new Date().toISOString(),
    })
  } catch (_) {}
}
