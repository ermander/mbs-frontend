'use client'

import * as React from 'react'
import Link from 'next/link'
import { Menu } from 'lucide-react'

import { cn } from '@/lib/utils'
import { POST_AUTH_REDIRECT } from '@/lib/auth-redirects'
import { DsWordmark, dsFocusRing } from '@/components/landing/ds-primitives'
import { TopnavDesktopNav } from './topnav-desktop-nav'
import { TopnavMobileSheet } from './topnav-mobile-sheet'
import { TopnavNotifications } from './topnav-notifications'
import { TopnavUserMenu } from './topnav-user-menu'
import { topnavDsScope } from './topnav-ds'

/**
 * Barra di navigazione dell'area autenticata, dalla Navbar del design OddWise (§14.275): 64px su
 * surface-raised con hairline sotto, marchio, voci allineate a sinistra, campanella e account a
 * destra, nella colonna da 1200px delle pagine. Sotto `lg` le voci passano in un cassetto aperto
 * dal pulsante a destra. È alta `--topnav-h` (globals.css): le pagine che dimensionano le tabelle
 * sull'altezza della finestra la sottraggono.
 */
export function Topnav() {
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <header
      className={cn(
        topnavDsScope,
        'sticky top-0 z-30 h-[var(--topnav-h)] border-b border-ds-line bg-ds-surface-raised',
      )}
    >
      <div className="mx-auto flex h-full w-full max-w-[1200px] items-center gap-6 px-4 sm:px-6">
        <Link
          href={POST_AUTH_REDIRECT}
          aria-label="OddWise"
          className={cn('shrink-0 rounded-ds-sm', dsFocusRing)}
        >
          <DsWordmark size="sm" />
        </Link>

        <TopnavDesktopNav className="hidden min-w-0 flex-1 lg:flex" />

        <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
          <TopnavNotifications />
          <TopnavUserMenu />
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Apri menu"
            aria-expanded={mobileOpen}
            className={cn(
              'inline-flex h-10 w-10 items-center justify-center rounded-ds-sm border border-ds-line-strong text-ds-ink lg:hidden',
              dsFocusRing,
            )}
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>

      <TopnavMobileSheet open={mobileOpen} onOpenChange={setMobileOpen} />
    </header>
  )
}
