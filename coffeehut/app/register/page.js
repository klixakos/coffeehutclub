import Link from 'next/link'
import AuthForm from '@/components/AuthForm'
import { register } from '../actions'

export default function RegisterPage() {
  return (
    <main className="shell">
      <p className="brand">coffeehut</p>
      <h1>Μπες στο Club</h1>
      <p className="lead">Σφραγίδες για δωρεάν καφέ και συμμετοχές στη μηνιαία κλήρωση.</p>
      <AuthForm mode="register" action={register} />
      <p className="alt">Έχεις ήδη λογαριασμό; <Link href="/login">Σύνδεση</Link></p>
    </main>
  )
}
