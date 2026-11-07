import AuthForm from '@/components/AuthForm'
import { staffLogin } from '../actions'

export default function StaffLogin() {
  return (
    <main className="shell">
      <p className="brand">coffeehut</p>
      <h1>Σύνδεση εργαζομένου</h1>
      <AuthForm mode="staff" action={staffLogin} />
    </main>
  )
}
