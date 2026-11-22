'use client'

import * as React from 'react'
import Link from 'next/link'
import { Menu } from 'lucide-react'

import { cn } from '@/lib/utils'
import { PAGE_COLUMN } from '@/lib/page-column'
import { LANDING_ROUTES } from '@/lib/landing-content'
import { DsWordmark, dsFocusRing } from '@/components/landing/ds-primitives'
import { TopnavDesktopNav } from './topnav-desktop-nav'
import { TopnavMobileSheet } from './topnav-mobile-sheet'
import { NOTIFICATIONS_IN_TOPNAV, TopnavNotifications } from './topnav-notifications'
import { TopnavUserMenu } from './topnav-user-menu'
import { topnavDsScope } from './topnav-ds'

/**
 * Barra di navigazione dell'area autenticata, dalla Navbar del design OddWise (§14.275): 64px su
 * surface-raised con hairline sotto, marchio a sinistra, voci e account a destra, nella colonna delle
 * pagine (PAGE_COLUMN). Sotto `lg` le voci passano in un cassetto aperto dal pulsante a destra. È
 * alta `--topnav-h` (globals.css): le pagine che dimensionano le tabelle sull'altezza della finestra
 * la sottraggono.
 *
 * §14.360 (richiesta di Emanuele): le voci stanno a destra, accanto all'account, e la campanella è
 * nascosta finché non ci sono notifiche vere (`NOTIFICATIONS_IN_TOPNAV`). Se le voci non ci stanno,
 * `justify-end-safe` le fa ripartire dal marchio invece di farle finire sotto di esso.
 *
 * §14.363 (richiesta di Emanuele): il marchio porta alla landing, non più alla dashboard, che resta
 * a un clic dalla tendina Tracker. Chi è entrato legge la landing con questa barra (SiteShell).
 */
export function Topnav() {
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <header
      className={cn(
        topnavDsScope,
        'sticky top-0 z-30 h-(--topnav-h) border-b border-ds-line bg-ds-surface-raised',
      )}
    >
      <div className={cn(PAGE_COLUMN, 'flex h-full items-center gap-6')}>
        <Link
          href={LANDING_ROUTES.home}
          aria-label="OddWise"
          className={cn('shrink-0 rounded-ds-sm', dsFocusRing)}
        >
          <DsWordmark size="sm" />
        </Link>

        <TopnavDesktopNav className="hidden min-w-0 flex-1 justify-end-safe lg:flex" />

        <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
          {NOTIFICATIONS_IN_TOPNAV && <TopnavNotifications />}
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
