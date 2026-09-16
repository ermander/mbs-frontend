'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { useAuthStore } from '@/stores/auth-store'
import { POST_AUTH_REDIRECT } from '@/lib/auth-redirects'
import { canUseTool, type ToolKey } from '@/lib/tools'

/**
 * Second-layer guard of a per-user tool page (§14.122), like the backoffice
 * one: the `(auth)` layout already guarantees the login and the `/me`
 * bootstrap; here only the tool matters. A user without it is sent to
 * `POST_AUTH_REDIRECT`; the backend refuses the tool's API anyway.
 */
export function ToolAuthGuard({ tool, children }: { tool: ToolKey; children: React.ReactNode }) {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const allowed = canUseTool(user, tool)

  useEffect(() => {
    if (user && !allowed) {
      router.replace(POST_AUTH_REDIRECT)
    }
  }, [user, allowed, router])

  if (!user || !allowed) return null

  return <>{children}</>
}
