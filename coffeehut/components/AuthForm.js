'use client'
import { useActionState } from 'react'

const LABEL = {
  register: 'Δημιουργία λογαριασμού', login: 'Σύνδεση', staff: 'Σύνδεση',
  setup: 'Δημιουργία ιδιοκτήτη', addstaff: 'Προσθήκη εργαζομένου',
}

export default function AuthForm({ mode, action }) {
  const [state, formAction, pending] = useActionState(action, {})
  const reg = mode === 'register'
  const hasName = ['register', 'setup', 'addstaff'].includes(mode)
  const hasPhone = ['register', 'login'].includes(mode)
  const hasUser = ['staff', 'setup', 'addstaff'].includes(mode)
  const len = hasUser ? 6 : 4
  const pat = `[0-9]{${len}}`
  return (
    <form action={formAction} className="form">
      {hasName && <label>Όνομα<input name="name" required maxLength={40} autoComplete={reg ? 'given-name' : 'off'} /></label>}
      {hasPhone && <label>Κινητό<input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="69xxxxxxxx" required /></label>}
      {hasUser && <label>Όνομα χρήστη (λατινικά, χωρίς κενά)<input name="username" required maxLength={20} autoCapitalize="none" autoCorrect="off" autoComplete="username" /></label>}
      <label>{reg ? 'Διάλεξε PIN (4 ψηφία)' : `PIN (${len} ψηφία)`}
        <input name="pin" type="password" inputMode="numeric" pattern={pat} maxLength={len} required
          autoComplete={reg ? 'new-password' : mode === 'addstaff' ? 'off' : 'current-password'} />
      </label>
      {reg && (
        <>
          <label>Ξανά το PIN<input name="pin2" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="new-password" required /></label>
          <label className="check"><input name="consent" type="checkbox" required />
            <span>Συμφωνώ να αποθηκευτούν το όνομα και το κινητό μου για τη λειτουργία του Hut Club.</span></label>
        </>
      )}
      {mode === 'setup' && <label>Κωδικός εγκατάστασης<input name="key" type="password" required autoComplete="off" /></label>}
      {state?.error && <p role="alert" className="error">{state.error}</p>}
      {state?.ok && <p role="status" className="okmsg">{state.ok}</p>}
      <button className="primary" disabled={pending}>{pending ? 'Μισό λεπτό…' : LABEL[mode]}</button>
    </form>
  )
}
