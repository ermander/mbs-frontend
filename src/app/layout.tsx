import './globals.css'

import type { Metadata } from 'next'
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
    icon: [{ url: '/loghi/mbs-favicon.svg', type: 'image/svg+xml' }],
    apple: '/loghi/mbs-app-icon-dark.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    url: 'https://matched-betting-system.com',
    siteName: 'MBS — Matched Betting System',
    title: 'MBS — Matched Betting System',
    description:
      'Confronta le quote, usa i calcolatori e massimizza i guadagni con il matched betting in modo legale e controllato.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MBS — Matched Betting System',
    description:
      'Confronta le quote, usa i calcolatori e massimizza i guadagni con il matched betting in modo legale e controllato.',
  },
  metadataBase: new URL('https://matched-betting-system.com'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
