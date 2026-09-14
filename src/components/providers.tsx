'use client'

import { Toaster } from 'sonner'
import { AuthRefreshProvider } from '@/components/auth/auth-refresh-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthRefreshProvider>{children}</AuthRefreshProvider>
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        theme="dark"
        toastOptions={{
          className: 'bg-card border-border text-foreground',
        }}
      />
    </>
  )
}
