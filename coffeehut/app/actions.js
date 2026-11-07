'use server'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { normalizePhone } from '@/lib/phone'
import { createSession, destroySession } from '@/lib/session'

const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 15

export async function register(prev, formData) {
  const name = String(formData.get('name') || '').trim()
  const phone = normalizePhone(formData.get('phone'))
  const pin = String(formData.get('pin') || '')
  const pin2 = String(formData.get('pin2') || '')
  const consent = formData.get('consent') === 'on'

  if (name.length < 2 || name.length > 40) return { error: 'Γράψε το όνομά σου (2 έως 40 χαρακτήρες).' }
  if (!phone) return { error: 'Γράψε κινητό με 10 ψηφία που ξεκινά από 69.' }
  if (!/^\d{4}$/.test(pin)) return { error: 'Το PIN πρέπει να έχει ακριβώς 4 ψηφία.' }
  if (pin !== pin2) return { error: 'Τα δύο PIN δεν ταιριάζουν.' }
  if (!consent) return { error: 'Χρειάζεται η συγκατάθεσή σου για να συνεχίσεις.' }

  const { data: store } = await supabase.from('stores').select('id').limit(1).single()
  if (!store) return { error: 'Η υπηρεσία δεν είναι έτοιμη ακόμα. Δοκίμασε αργότερα.' }

  const { data, error } = await supabase
    .from('customers')
    .insert({
      store_id: store.id,
      name,
      phone,
      pin_hash: await bcrypt.hash(pin, 10),
      qr_token: randomBytes(24).toString('base64url'),
    })
    .select('id')
    .single()

  if (error?.code === '23505') return { error: 'Αυτό το κινητό έχει ήδη λογαριασμό. Πήγαινε στη σύνδεση.' }
  if (error || !data) return { error: 'Κάτι πήγε στραβά. Δοκίμασε ξανά.' }

  await createSession('customer', data.id)
  redirect('/home')
}

export async function login(prev, formData) {
  const phone = normalizePhone(formData.get('phone'))
  const pin = String(formData.get('pin') || '')
  const generic = { error: 'Λάθος κινητό ή PIN.' }
  if (!phone || !/^\d{4}$/.test(pin)) return generic

  const { data: c } = await supabase
    .from('customers')
    .select('id, pin_hash, failed_attempts, locked_until, is_blocked')
    .eq('phone', phone)
    .maybeSingle()
  if (!c) return generic
  if (c.is_blocked) return { error: 'Ο λογαριασμός είναι ανενεργός. Μίλησε με το προσωπικό.' }
  if (c.locked_until && new Date(c.locked_until) > new Date()) {
    return { error: 'Πολλές προσπάθειες. Δοκίμασε ξανά σε λίγα λεπτά.' }
  }

  if (!(await bcrypt.compare(pin, c.pin_hash))) {
    const attempts = c.failed_attempts + 1
    const lock = attempts >= MAX_ATTEMPTS
    await supabase
      .from('customers')
      .update({
        failed_attempts: lock ? 0 : attempts,
        locked_until: lock ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : null,
      })
      .eq('id', c.id)
    return generic
  }

  await supabase.from('customers').update({ failed_attempts: 0, locked_until: null }).eq('id', c.id)
  await createSession('customer', c.id)
  redirect('/home')
}

export async function logout() {
  await destroySession('customer')
  redirect('/login')
}
