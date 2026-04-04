'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore, useAuthHydrated } from '@/stores/auth-store'

export function GuestGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const isHydrated = useAuthHydrated()

  useEffect(() => {
    if (!isHydrated) return
    if (isLoggedIn) {
      router.replace('/')
    }
  }, [isHydrated, isLoggedIn, router])

  if (!isHydrated || isLoggedIn) return null

  return <>{children}</>
}
