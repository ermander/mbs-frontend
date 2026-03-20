'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { queryClient } from '@/lib/react-query'
import { AuthRefreshProvider } from '@/components/auth/auth-refresh-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthRefreshProvider>{children}</AuthRefreshProvider>
      <Toaster position="bottom-right" richColors closeButton />
    </QueryClientProvider>
  )
}
