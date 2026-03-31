'use client'

import { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { queryClient } from '@/lib/react-query'
import { AuthRefreshProvider } from '@/components/auth/auth-refresh-provider'
import { THEME_STORAGE_KEY, isValidThemeId } from '@/lib/theme'

function ThemeHydrator() {
  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored && isValidThemeId(stored)) {
      document.documentElement.setAttribute('data-theme', stored)
    }
  }, [])
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeHydrator />
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
    </QueryClientProvider>
  )
}
