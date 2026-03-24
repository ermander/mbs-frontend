import './globals.css'

import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Providers } from '@/components/providers'

export const metadata: Metadata = {
  title: {
    default: 'MBS — Matched Betting System',
    template: '%s | MBS',
  },
  description:
    'Confronta le quote, usa i calcolatori e massimizza i guadagni con il matched betting in modo legale e controllato.',
  icons: {
    icon: [
      { url: '/loghi/mbs-favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    apple: '/loghi/mbs-app-icon-dark.svg',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? ''

  return (
    <html
      lang="it"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <script
          suppressHydrationWarning
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('mbs-theme');var m={slate:'neon',warm:'neon-warm',oled:'neon-oled','light-slate':'light-clean','light-warm':'light-clean','light-pure':'light-clean'};if(m[t]){t=m[t];localStorage.setItem('mbs-theme',t)}var v=['neon','neon-warm','neon-oled','light-clean'];if(!t||v.indexOf(t)===-1)t='neon';document.documentElement.setAttribute('data-theme',t);})();`,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
