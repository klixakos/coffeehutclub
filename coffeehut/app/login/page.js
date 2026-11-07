import Link from 'next/link'
import AuthForm from '@/components/AuthForm'
import { login } from '../actions'

export default function LoginPage() {
  return (
    <main className="shell">
      <p className="brand">coffeehut</p>
      <h1>Καλώς ήρθες πάλι</h1>
      <AuthForm mode="login" action={login} />
      <p className="alt">Δεν έχεις λογαριασμό; <Link href="/register">Εγγραφή</Link></p>
    </main>
  )
}
