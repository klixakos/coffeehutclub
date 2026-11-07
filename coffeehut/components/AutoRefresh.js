'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AutoRefresh({ every = 8000 }) {
  const router = useRouter()
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) router.refresh() }, every)
    return () => clearInterval(t)
  }, [router, every])
  return null
}
