'use client'

import * as React from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '#come-funziona', label: 'Come funziona' },
  { href: '#strumenti', label: 'Strumenti' },
  { href: '#prezzi', label: 'Prezzi' },
  { href: '#faq', label: 'FAQ' },
] as const

export function Header() {
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b border-white/10 bg-white/5 backdrop-blur-md',
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="rounded text-lg font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          MBS
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Menu principale">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Accedi</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/registrazione">Registrati</Link>
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? 'Chiudi menu' : 'Apri menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {mobileOpen && (
        <div
          className="border-t border-white/10 bg-background/95 backdrop-blur-md md:hidden"
          role="dialog"
          aria-label="Menu di navigazione"
        >
          <nav className="flex flex-col gap-1 px-4 py-4" aria-label="Menu mobile">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                {label}
              </Link>
            ))}
            <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4">
              <Button variant="ghost" asChild className="justify-center">
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  Accedi
                </Link>
              </Button>
              <Button asChild className="justify-center">
                <Link href="/registrazione" onClick={() => setMobileOpen(false)}>
                  Registrati
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
