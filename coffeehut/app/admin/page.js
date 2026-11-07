import Link from 'next/link'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getStaff, athensTime } from '@/lib/auth'
import AuthForm from '@/components/AuthForm'
import { createStaff, toggleStaff, voidVisit } from './actions'
import { staffLogout } from '../staff/actions'

export const dynamic = 'force-dynamic'

export default async function Admin() {
  const me = await getStaff()
  if (!me) redirect('/staff/login')
  if (me.role !== 'owner') redirect('/staff')

  const [{ data: staff }, { data: visits }, { count }] = await Promise.all([
    supabase.from('staff').select('id, name, username, role, is_active').eq('store_id', me.store_id).order('created_at'),
    supabase.from('visits').select('id, created_at, voided_at, customers(name), staff(name)')
      .eq('store_id', me.store_id).order('created_at', { ascending: false }).limit(30),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('store_id', me.store_id),
  ])

  return (
    <main className="shell wide">
      <header className="top"><h1>Διαχείριση</h1><Link href="/staff">Ταμείο</Link></header>
      <p className="muted">Πελάτες: {count ?? 0}</p>

      <section className="card">
        <p className="small-title">Εργαζόμενοι</p>
        {staff?.map((s) => (
          <div key={s.id} className="line">
            <span>{s.name} <small className="muted">({s.username}{s.role === 'owner' ? ', ιδιοκτήτης' : ''})</small></span>
            {s.id !== me.id && (
              <form action={toggleStaff.bind(null, s.id, !s.is_active)}>
                <button className="link">{s.is_active ? 'Απενεργοποίηση' : 'Ενεργοποίηση'}</button>
              </form>
            )}
          </div>
        ))}
        <p className="small-title spaced">Νέος εργαζόμενος</p>
        <AuthForm mode="addstaff" action={createStaff} />
      </section>

      <section className="card">
        <p className="small-title">Τελευταίες σφραγίδες</p>
        {visits?.map((v) => (
          <div key={v.id} className="line">
            <span style={v.voided_at ? { textDecoration: 'line-through' } : undefined}>
              {athensTime(v.created_at, true)} · {v.customers?.name} <small className="muted">({v.staff?.name})</small>
            </span>
            {!v.voided_at && (
              <form action={voidVisit.bind(null, v.id)}><button className="link">Ακύρωση</button></form>
            )}
          </div>
        ))}
      </section>
      <form action={staffLogout}><button className="ghost">Αποσύνδεση</button></form>
    </main>
  )
}
