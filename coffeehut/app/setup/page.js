import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AuthForm from '@/components/AuthForm'
import { setupOwner } from '../admin/actions'

export const dynamic = 'force-dynamic'

export default async function Setup() {
  const { count } = await supabase.from('staff').select('id', { count: 'exact', head: true }).eq('role', 'owner')
  if (count > 0) redirect('/staff/login')
  return (
    <main className="shell">
      <p className="brand">coffeehut</p>
      <h1>Πρώτη εγκατάσταση</h1>
      <p className="lead">Φτιάξε τον λογαριασμό ιδιοκτήτη. Θα χρειαστείς τον κωδικό εγκατάστασης (SETUP_KEY) από το Vercel.</p>
      <AuthForm mode="setup" action={setupOwner} />
    </main>
  )
}
