'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'

export function GuestGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)

  useEffect(() => {
    if (isLoggedIn) {
      router.replace('/')
    }
  }, [isLoggedIn, router])

  if (isLoggedIn) return null

  return <>{children}</>
}
