import './globals.css'

import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Bricolage_Grotesque, JetBrains_Mono } from 'next/font/google'
import { Providers } from '@/components/providers'

// Font OddWise (landing). Titoli e testo usano Geist Sans (font-sans, già caricato per
// l'area autenticata); Bricolage Grotesque 800 resta solo per il marchio (font-ow-display);
// JetBrains Mono per quote, importi e prezzi (font-ow-mono). Mappati in tailwind.config.js.
const owDisplay = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['800'],
  variable: '--font-ow-display',
  display: 'swap',
})
const owMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-ow-mono',
  display: 'swap',
})

const DESCRIPTION =
  'Il Matched Betting trasforma i bonus dei siti di scommesse in soldi veri, qualunque sia il risultato. Noi ti diamo gli strumenti e le guide, tu pensi solo al profitto!'

export const metadata: Metadata = {
  title: {
    default: 'OddWise',
    template: '%s | OddWise',
  },
  description: DESCRIPTION,
  icons: {
    icon: [{ url: '/loghi/oddwise-mark.svg', type: 'image/svg+xml' }],
    apple: '/loghi/oddwise-app-icon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    url: 'https://matched-betting-system.com',
    siteName: 'OddWise',
    title: 'OddWise',
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OddWise',
    description: DESCRIPTION,
  },
  metadataBase: new URL('https://matched-betting-system.com'),
}

// Tema della landing: dark blu di default; NEXT_PUBLIC_OW_THEME=green|light per le varianti
// di tokens.css (data-theme sull'<html>).
const OW_THEME = process.env.NEXT_PUBLIC_OW_THEME
const dataTheme = OW_THEME === 'green' || OW_THEME === 'light' ? OW_THEME : undefined

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading headers forces dynamic rendering so Next.js injects the per-request
  // nonce (from middleware x-nonce header) into its generated <script> tags.
  await headers()
  return (
    <html
      lang="it"
      data-theme={dataTheme}
      className={`${GeistSans.variable} ${GeistMono.variable} ${owDisplay.variable} ${owMono.variable}`}
    >
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
