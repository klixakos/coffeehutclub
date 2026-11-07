import QRCode from 'qrcode'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getSessionId } from '@/lib/session'
import { getProgress, athensTime } from '@/lib/auth'
import Mandala from '@/components/Mandala'
import AutoRefresh from '@/components/AutoRefresh'
import { logout } from '../actions'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const id = await getSessionId('customer')
  if (!id) redirect('/login')
  const { data: c } = await supabase
    .from('customers').select('name, qr_token, is_blocked').eq('id', id).maybeSingle()
  if (!c || c.is_blocked) redirect('/login')

  const progress = await getProgress(id)
  const { data: recent } = await supabase
    .from('visits').select('id, created_at').eq('customer_id', id).is('voided_at', null)
    .order('created_at', { ascending: false }).limit(5)
  const svg = await QRCode.toString('CH1:' + c.qr_token, {
    type: 'svg', margin: 1, color: { dark: '#2E3540', light: '#FFFFFF' },
  })
  const left = 10 - progress

  return (
    <main className="shell">
      <AutoRefresh />
      <header className="top">
        <div><p className="muted">Γεια σου</p><h1>{c.name}</h1></div>
        <p className="brand">coffeehut</p>
      </header>
      <section className="card row">
        <Mandala k={progress} size={104} />
        <div>
          <p className="big">{progress} από 10</p>
          <p className="muted">
            {left === 0 ? 'Ο καφές σου είναι έτοιμος! Πες το στο ταμείο.'
              : `Ακόμα ${left} ${left === 1 ? 'καφές' : 'καφέδες'} και ο επόμενος είναι δικός μας.`}
          </p>
        </div>
      </section>
      <section className="arch">
        <div className="qr" role="img" aria-label="Το προσωπικό σου QR" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="muted">Δείξε το στο ταμείο</p>
      </section>
      {recent?.length > 0 && (
        <section className="card">
          <p className="small-title">Τελευταίες επισκέψεις</p>
          {recent.map((v) => (
            <p key={v.id} className="line"><span>{athensTime(v.created_at, true)}</span><span>+1 σφραγίδα</span></p>
          ))}
        </section>
      )}
      <form action={logout}><button className="ghost">Αποσύνδεση</button></form>
    </main>
  )
}
