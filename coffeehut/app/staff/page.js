import { redirect } from 'next/navigation'
import { getStaff } from '@/lib/auth'
import StaffApp from '@/components/StaffApp'

export const dynamic = 'force-dynamic'

export default async function StaffPage() {
  const me = await getStaff()
  if (!me) redirect('/staff/login')
  return <StaffApp staffName={me.name} isOwner={me.role === 'owner'} />
}
