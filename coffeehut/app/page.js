import { redirect } from 'next/navigation'
import { getSessionId } from '@/lib/session'

export default async function Index() {
  redirect((await getSessionId('customer')) ? '/home' : '/login')
}
