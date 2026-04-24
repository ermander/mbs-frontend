'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore, useAuthHydrated } from '@/stores/auth-store'
import { POST_AUTH_REDIRECT } from '@/lib/auth-redirects'

export function GuestGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const isHydrated = useAuthHydrated()

  useEffect(() => {
    if (!isHydrated) return
    if (isLoggedIn) {
      router.replace(POST_AUTH_REDIRECT)
    }
  }, [isHydrated, isLoggedIn, router])

  if (!isHydrated || isLoggedIn) return null

  return <>{children}</>
}
