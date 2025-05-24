import type { Metadata } from 'next'
import { Provider } from 'react-redux';
import { store } from './store';

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
      <body>
        <Provider store={store}>
          {children}
        </Provider>
      </body>
    </html>
  )
} 