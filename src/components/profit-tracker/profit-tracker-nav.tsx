'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

export const profitTrackerNavItems = [
  { href: '/profit-tracker/dashboard', label: 'Dashboard' },
  { href: '/profit-tracker/giocate', label: 'Giocate' },
  { href: '/profit-tracker/archivio', label: 'Archivio' },
  { href: '/profit-tracker/gestione-conti', label: 'Gestione Conti' },
  { href: '/profit-tracker/book-personali', label: 'Impostazioni' },
  { href: '/profit-tracker/promemoria', label: 'Promemoria' },
] as const

export function ProfitTrackerNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navigazione Profit Tracker"
      className="mb-6 flex flex-wrap gap-2 rounded-lg border border-border bg-background/60 p-1 text-sm"
    >
      {profitTrackerNavItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== '/profit-tracker/dashboard' && pathname.startsWith(item.href))

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'inline-flex items-center rounded-md px-3 py-1.5 font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
