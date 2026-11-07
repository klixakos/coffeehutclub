'use server'
import bcrypt from 'bcryptjs'
import { timingSafeEqual } from 'crypto'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { createSession } from '@/lib/session'
import { getStaff } from '@/lib/auth'

function validStaffFields(formData) {
  const name = String(formData.get('name') || '').trim()
  const username = String(formData.get('username') || '').trim().toLowerCase()
  const pin = String(formData.get('pin') || '')
  if (name.length < 2 || name.length > 40) return { error: 'Γράψε όνομα (2 έως 40 χαρακτήρες).' }
  if (!/^[a-z0-9]{3,20}$/.test(username)) return { error: 'Όνομα χρήστη: 3–20 λατινικά γράμματα ή αριθμοί.' }
  if (!/^\d{6}$/.test(pin)) return { error: 'Το PIN πρέπει να έχει ακριβώς 6 ψηφία.' }
  return { name, username, pin }
}

export async function setupOwner(prev, formData) {
  const expected = process.env.SETUP_KEY || ''
  const given = String(formData.get('key') || '')
  const a = Buffer.from(expected), b = Buffer.from(given)
  if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) return { error: 'Λάθος κωδικός εγκατάστασης.' }
  const { count } = await supabase.from('staff').select('id', { count: 'exact', head: true }).eq('role', 'owner')
  if (count > 0) return { error: 'Ο ιδιοκτήτης έχει ήδη δημιουργηθεί.' }
  const f = validStaffFields(formData)
  if (f.error) return f
  const { data: store } = await supabase.from('stores').select('id').limit(1).single()
  if (!store) return { error: 'Λείπει το κατάστημα. Έτρεξε το SQL;' }
  const { data, error } = await supabase.from('staff').insert({
    store_id: store.id, name: f.name, username: f.username,
    pin_hash: await bcrypt.hash(f.pin, 10), role: 'owner',
  }).select('id').single()
  if (error || !data) return { error: 'Κάτι πήγε στραβά. Δοκίμασε ξανά.' }
  await createSession('staff', data.id)
  redirect('/admin')
}

export async function createStaff(prev, formData) {
  const me = await getStaff()
  if (!me || me.role !== 'owner') return { error: 'Δεν έχεις δικαίωμα.' }
  const f = validStaffFields(formData)
  if (f.error) return f
  const { error } = await supabase.from('staff').insert({
    store_id: me.store_id, name: f.name, username: f.username,
    pin_hash: await bcrypt.hash(f.pin, 10), role: 'staff',
  })
  if (error?.code === '23505') return { error: 'Αυτό το όνομα χρήστη υπάρχει ήδη.' }
  if (error) return { error: 'Κάτι πήγε στραβά. Δοκίμασε ξανά.' }
  revalidatePath('/admin')
  return { ok: `Ο/Η ${f.name} προστέθηκε.` }
}

export async function toggleStaff(id, active) {
  const me = await getStaff()
  if (!me || me.role !== 'owner' || me.id === id) return
  await supabase.from('staff').update({ is_active: active }).eq('id', id).eq('store_id', me.store_id)
  revalidatePath('/admin')
}

export async function voidVisit(id) {
  const me = await getStaff()
  if (!me || me.role !== 'owner') return
  await supabase.from('visits').update({ voided_at: new Date().toISOString(), voided_by: me.id })
    .eq('id', id).eq('store_id', me.store_id).is('voided_at', null)
  revalidatePath('/admin')
}
