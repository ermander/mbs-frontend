'use client'
import './globals.css'

import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/react-query'
import { AuthRefreshProvider } from '@/components/auth/auth-refresh-provider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('mbs-theme');var v=['slate','warm','oled','light-slate','light-warm','light-pure'];if(!t||v.indexOf(t)===-1)t='slate';document.documentElement.setAttribute('data-theme',t);})();`,
          }}
        />
        <QueryClientProvider client={queryClient}>
          <AuthRefreshProvider>{children}</AuthRefreshProvider>
        </QueryClientProvider>
      </body>
    </html>
  )
}
