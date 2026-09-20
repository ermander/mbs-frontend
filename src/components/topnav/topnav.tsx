'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu } from 'lucide-react'

import { cn } from '@/lib/utils'
import { POST_AUTH_REDIRECT } from '@/lib/auth-redirects'
import { TopnavDesktopNav } from './topnav-desktop-nav'
import { TopnavMobileSheet } from './topnav-mobile-sheet'
import { TopnavUserMenu } from './topnav-user-menu'

/**
 * Barra di navigazione dell'area autenticata (§14.146). Da `lg` in su è una griglia a tre
 * colonne (logo · voci · account) con le voci centrate nella barra; sotto, hamburger e logo a
 * sinistra, avatar a destra, e le voci in un cassetto laterale. È alta `--topnav-h`
 * (globals.css): le pagine che dimensionano le tabelle sull'altezza della finestra la
 * sottraggono.
 */
export function Topnav() {
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <header className="sticky top-0 z-30 h-[var(--topnav-h)] border-b border-border bg-card/80 backdrop-blur-md">
      <div className="flex h-full items-center gap-2 px-4 md:px-8 lg:grid lg:grid-cols-[1fr_auto_1fr]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Apri menu"
            aria-expanded={mobileOpen}
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors lg:hidden',
              'hover:bg-accent hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link
            href={POST_AUTH_REDIRECT}
            className="flex shrink-0 items-center gap-2 rounded-md px-1 text-base font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Image
              src="/loghi/mbs-icon.svg"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 shrink-0"
              priority
            />
            <span className="text-gradient-primary">MBS</span>
          </Link>
        </div>

        <TopnavDesktopNav className="hidden lg:flex" />

        <div className="ml-auto flex shrink-0 items-center lg:ml-0 lg:justify-self-end">
          <TopnavUserMenu />
        </div>
      </div>

      <TopnavMobileSheet open={mobileOpen} onOpenChange={setMobileOpen} />
    </header>
  )
}
