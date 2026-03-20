import './globals.css'

import { headers } from 'next/headers'
import { Providers } from '@/components/providers'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? ''

  return (
    <html lang="it" suppressHydrationWarning>
      <body>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('mbs-theme');var v=['slate','warm','oled','light-slate','light-warm','light-pure'];if(!t||v.indexOf(t)===-1)t='light-warm';document.documentElement.setAttribute('data-theme',t);})();`,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
