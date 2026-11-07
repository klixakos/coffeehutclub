import 'server-only'
import { supabase } from './supabase'
import { getSessionId } from './session'

export async function getStaff() {
  const id = await getSessionId('staff')
  if (!id) return null
  const { data } = await supabase
    .from('staff').select('id, name, role, store_id, is_active').eq('id', id).maybeSingle()
  return data && data.is_active ? data : null
}

export async function getProgress(customerId) {
  const [v, r] = await Promise.all([
    supabase.from('visits').select('id', { count: 'exact', head: true }).eq('customer_id', customerId).is('voided_at', null),
    supabase.from('redemptions').select('id', { count: 'exact', head: true }).eq('customer_id', customerId).is('voided_at', null),
  ])
  const progress = (v.count || 0) - 10 * (r.count || 0)
  return Math.max(0, Math.min(10, progress))
}

export function shortName(name) {
  const p = String(name).trim().split(/\s+/)
  return p.length > 1 ? `${p[0]} ${p[1][0]}.` : p[0]
}

export function athensTime(iso, withDate = false) {
  return new Date(iso).toLocaleString('el-GR', {
    timeZone: 'Europe/Athens',
    hour: '2-digit', minute: '2-digit',
    ...(withDate ? { day: '2-digit', month: '2-digit' } : {}),
  })
}
