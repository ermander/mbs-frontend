import './globals.css';
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Betting Arbitrage System',
  description: 'A system for finding and managing betting arbitrage opportunities',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
} 