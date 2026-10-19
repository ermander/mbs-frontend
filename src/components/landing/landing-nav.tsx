'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

import { BRAND, LANDING_NAV_LINKS, LANDING_ROUTES } from '@/lib/landing-content'
import { cn } from '@/lib/utils'
import { DsButton, DsContainer, DsWordmark, dsFocusRing } from '@/components/landing/ds-primitives'

/** Voce della barra: 500 in ink-muted, ink al passaggio (l'indicatore della voce attiva non serve sulla landing). */
const linkClass = cn(
  'flex h-16 items-center rounded-ds-sm px-3 font-medium text-ds-ink-muted transition-colors hover:text-ds-ink',
  dsFocusRing,
)

/**
 * La Navbar del design: 64px su surface-raised con hairline sotto, marchio, cinque voci e due
 * azioni (Accedi in ghost, Inizia gratis in primary). Sotto lg un pulsante apre il menu a colonna.
 */
export function LandingNav() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <header className="border-b border-ds-line bg-ds-surface-raised">
      <DsContainer className="flex h-16 items-center gap-6">
        <Link
          href={LANDING_ROUTES.home}
          aria-label={BRAND.name}
          className={cn('rounded-ds-sm', dsFocusRing)}
        >
          <DsWordmark size="sm" />
        </Link>

        <nav aria-label="Principale" className="hidden flex-1 lg:block">
          <ul className="flex items-center gap-1">
            {LANDING_NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={linkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <DsButton href={LANDING_ROUTES.login} variant="ghost">
            {BRAND.login}
          </DsButton>
          <DsButton href={LANDING_ROUTES.register} variant="primary">
            {BRAND.signup}
          </DsButton>
        </div>

        <button
          type="button"
          aria-label={open ? BRAND.closeMenu : BRAND.openMenu}
          aria-expanded={open}
          aria-controls="landing-menu"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'ml-auto inline-flex h-10 w-10 items-center justify-center rounded-ds-sm border border-ds-line-strong text-ds-ink lg:hidden',
            dsFocusRing,
          )}
        >
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </DsContainer>

      {open && (
        <div id="landing-menu" className="border-t border-ds-line bg-ds-surface-raised lg:hidden">
          <DsContainer className="flex flex-col gap-0.5 py-3">
            {LANDING_NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                className={cn(
                  'rounded-ds-sm px-3 py-2.5 font-medium text-ds-ink-muted transition-colors hover:bg-ds-surface-sunken hover:text-ds-ink',
                  dsFocusRing,
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-ds-line pt-3">
              <DsButton href={LANDING_ROUTES.login} variant="ghost" block>
                {BRAND.login}
              </DsButton>
              <DsButton href={LANDING_ROUTES.register} variant="primary" block>
                {BRAND.signup}
              </DsButton>
            </div>
          </DsContainer>
        </div>
      )}
    </header>
  )
}
