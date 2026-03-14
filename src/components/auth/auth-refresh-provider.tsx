'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { setOnRefreshFailure } from '@/services/api/client'
import { useAuthStore } from '@/stores/auth-store'

export function AuthRefreshProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    setOnRefreshFailure(() => {
      useAuthStore.getState().clearUser()
      router.replace('/login')
    })
    return () => setOnRefreshFailure(null)
  }, [router])

  return <>{children}</>
}
