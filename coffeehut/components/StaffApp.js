'use client'
import { useState } from 'react'
import Link from 'next/link'
import Scanner from './Scanner'
import Mandala from './Mandala'
import { lookupCustomer, confirmStamp, redeemCard, undoStamp, staffLogout } from '@/app/staff/actions'

export default function StaffApp({ staffName, isOwner }) {
  const [mode, setMode] = useState('idle') // idle | scanning | preview | done
  const [cust, setCust] = useState(null)
  const [progress, setProgress] = useState(0)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)

  const reset = () => { setMode('idle'); setCust(null); setMsg(''); setDone(null) }

  async function find(args) {
    setBusy(true); setMsg('')
    const r = await lookupCustomer(args)
    setBusy(false)
    if (r.error) { setMsg(r.error); setMode('idle'); return }
    setCust(r.customer); setProgress(r.progress); setMode('preview')
  }

  async function stamp() {
    setBusy(true); setMsg('')
    const r = await confirmStamp(cust.id)
    setBusy(false)
    if (r.error) { setMsg(r.error); return }
    setDone({ title: `${cust.name}: ${r.progress} από 10`, visitId: r.visitId, full: r.progress >= 10 })
    setMode('done')
  }

  async function redeem() {
    setBusy(true); setMsg('')
    const r = await redeemCard(cust.id)
    setBusy(false)
    if (r.error) { setMsg(r.error); return }
    setDone({ title: `Κερασμένος καφές για ${cust.name}!`, visitId: null })
    setMode('done')
  }

  async function undo() {
    setBusy(true)
    const r = await undoStamp(done.visitId)
    setBusy(false)
    if (r.error) { setMsg(r.error); return }
    reset(); setMsg('Η σφράγιση ακυρώθηκε.')
  }

  return (
    <div className="dark">
      <main className="shell">
        <div className="staffbar">
          <span>Coffee Hut · Ταμείο</span>
          <span>{staffName}</span>
        </div>

        {mode === 'idle' && (
          <>
            <button className="primary big-btn" onClick={() => { setMsg(''); setMode('scanning') }}>Σάρωση QR πελάτη</button>
            <form className="form" onSubmit={(e) => { e.preventDefault(); find({ phone: e.currentTarget.phone.value }) }}>
              <label>Ή αναζήτηση με κινητό
                <input name="phone" type="tel" inputMode="tel" placeholder="69xxxxxxxx" required />
              </label>
              <button className="ghost" disabled={busy}>Αναζήτηση</button>
            </form>
          </>
        )}

        {mode === 'scanning' && (
          <>
            <Scanner onCode={(t) => find({ token: t })} onError={(e) => { setMsg(e); setMode('idle') }} />
            <button className="ghost" onClick={reset}>Άκυρο</button>
          </>
        )}

        {mode === 'preview' && cust && (
          <>
            <section className="lightcard row">
              <Mandala k={progress} size={92} />
              <div><p className="muted caps">ΠΕΛΑΤΗΣ</p><p className="big">{cust.name}</p><p className="muted">{progress} από 10</p></div>
            </section>
            {progress < 10 ? (
              <>
                <section className="lightcard center"><p className="huge">+1</p><p>σφραγίδα · θα γίνει {progress + 1} από 10</p></section>
                <button className="primary big-btn" onClick={stamp} disabled={busy}>{busy ? 'Μισό λεπτό…' : 'Επιβεβαίωση'}</button>
              </>
            ) : (
              <>
                <section className="lightcard center"><p className="big">Έχει δωρεάν καφέ!</p><p>Η κάρτα είναι γεμάτη.</p></section>
                <button className="primary big-btn" onClick={redeem} disabled={busy}>{busy ? 'Μισό λεπτό…' : 'Εξαργύρωση δωρεάν καφέ'}</button>
              </>
            )}
            <button className="ghost" onClick={reset}>Ακύρωση</button>
          </>
        )}

        {mode === 'done' && done && (
          <>
            <section className="lightcard center ok"><p className="big">Έγινε!</p><p>{done.title}</p>{done.full && <p>Η κάρτα γέμισε. Την επόμενη φορά κερνάμε καφέ.</p>}</section>
            {done.visitId && <button className="ghost" onClick={undo} disabled={busy}>Ακύρωση σφράγισης (2 λεπτά)</button>}
            <button className="primary big-btn" onClick={reset}>Επόμενος πελάτης</button>
          </>
        )}

        {msg && <p role="alert" className="error">{msg}</p>}

        <div className="staffbar foot">
          {isOwner && <Link href="/admin">Διαχείριση</Link>}
          <form action={staffLogout}><button className="link">Αποσύνδεση</button></form>
        </div>
      </main>
    </div>
  )
}
