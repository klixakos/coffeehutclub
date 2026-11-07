'use server'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { normalizePhone } from '@/lib/phone'
import { createSession, destroySession } from '@/lib/session'
import { getStaff, getProgress, shortName, athensTime } from '@/lib/auth'

const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 15

export async function staffLogin(prev, formData) {
  const username = String(formData.get('username') || '').trim().toLowerCase()
  const pin = String(formData.get('pin') || '')
  const generic = { error: 'Λάθος στοιχεία.' }
  if (!/^[a-z0-9]{3,20}$/.test(username) || !/^\d{6}$/.test(pin)) return generic

  const { data: s } = await supabase
    .from('staff').select('id, role, pin_hash, failed_attempts, locked_until, is_active')
    .eq('username', username).maybeSingle()
  if (!s || !s.is_active) return generic
  if (s.locked_until && new Date(s.locked_until) > new Date()) {
    return { error: 'Πολλές προσπάθειες. Δοκίμασε ξανά σε λίγα λεπτά.' }
  }
  if (!(await bcrypt.compare(pin, s.pin_hash))) {
    const attempts = s.failed_attempts + 1
    const lock = attempts >= MAX_ATTEMPTS
    await supabase.from('staff').update({
      failed_attempts: lock ? 0 : attempts,
      locked_until: lock ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : null,
    }).eq('id', s.id)
    return generic
  }
  await supabase.from('staff').update({ failed_attempts: 0, locked_until: null }).eq('id', s.id)
  await createSession('staff', s.id)
  redirect(s.role === 'owner' ? '/admin' : '/staff')
}

export async function staffLogout() {
  await destroySession('staff')
  redirect('/staff/login')
}

export async function lookupCustomer({ token, phone }) {
  const staff = await getStaff()
  if (!staff) return { error: 'Η σύνδεσή σου έληξε. Ξαναμπές.' }
  let q = supabase.from('customers').select('id, name, is_blocked').eq('store_id', staff.store_id)
  if (token) {
    if (typeof token !== 'string' || token.length > 64) return { error: 'Μη έγκυρο QR.' }
    q = q.eq('qr_token', token)
  } else {
    const p = normalizePhone(phone)
    if (!p) return { error: 'Γράψε κινητό 10 ψηφίων που ξεκινά από 69.' }
    q = q.eq('phone', p)
  }
  const { data: c } = await q.maybeSingle()
  if (!c) return { error: 'Δεν βρέθηκε πελάτης.' }
  if (c.is_blocked) return { error: 'Ο λογαριασμός είναι ανενεργός.' }
  return { customer: { id: c.id, name: shortName(c.name) }, progress: await getProgress(c.id) }
}

const MSG = {
  not_found: 'Δεν βρέθηκε πελάτης.',
  blocked: 'Ο λογαριασμός είναι ανενεργός.',
  card_full: 'Η κάρτα είναι γεμάτη. Κάνε εξαργύρωση.',
  daily_limit: 'Έχει φτάσει το ημερήσιο όριο σφραγίδων.',
  not_ready: 'Η κάρτα δεν έχει ακόμα 10 σφραγίδες.',
}

export async function confirmStamp(customerId) {
  const staff = await getStaff()
  if (!staff) return { error: 'Η σύνδεσή σου έληξε. Ξαναμπές.' }
  const { data, error } = await supabase.rpc('add_stamp', { p_customer: customerId, p_staff: staff.id })
  if (error || !data) return { error: 'Κάτι πήγε στραβά. Δοκίμασε ξανά.' }
  if (!data.ok) {
    if (data.code === 'cooldown') return { error: `Έχει σφραγιστεί πριν από λίγο. Ξανά μετά τις ${athensTime(data.retry_at)}.` }
    return { error: MSG[data.code] || 'Δεν έγινε η σφράγιση.' }
  }
  return { visitId: data.visit_id, progress: data.progress }
}

export async function redeemCard(customerId) {
  const staff = await getStaff()
  if (!staff) return { error: 'Η σύνδεσή σου έληξε. Ξαναμπές.' }
  const { data, error } = await supabase.rpc('redeem_card', { p_customer: customerId, p_staff: staff.id })
  if (error || !data) return { error: 'Κάτι πήγε στραβά. Δοκίμασε ξανά.' }
  if (!data.ok) return { error: MSG[data.code] || 'Δεν έγινε η εξαργύρωση.' }
  return { redeemed: true }
}

export async function undoStamp(visitId) {
  const staff = await getStaff()
  if (!staff) return { error: 'Η σύνδεσή σου έληξε. Ξαναμπές.' }
  const { data } = await supabase.rpc('void_visit', { p_visit: visitId, p_staff: staff.id })
  return data?.ok ? { ok: true } : { error: 'Η ακύρωση επιτρέπεται μόνο μέσα σε 2 λεπτά.' }
}
