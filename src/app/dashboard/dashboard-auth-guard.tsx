'use client'

import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { useEffect } from 'react'

export function DashboardAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (user === null) {
      router.replace('/login')
    }
  }, [user, router])

  if (user === null) {
    return null
  }

  return <>{children}</>
}
