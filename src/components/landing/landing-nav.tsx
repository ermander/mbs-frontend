'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

import { BRAND, LANDING_NAV_LINKS, LANDING_ROUTES, isCurrentSection } from '@/lib/landing-content'
import { cn } from '@/lib/utils'
import {
  DsButton,
  DsContainer,
  DsWordmark,
  dsFocusRing,
  dsNavLinkClass,
} from '@/components/landing/ds-primitives'
import { NavExpandable, NavHoverMenu } from '@/components/topnav/nav-submenu'

/** Una riga del menu del telefono. */
const MENU_ROW =
  'flex items-center rounded-ds-sm px-3 py-2.5 font-medium text-ds-ink-muted transition-colors hover:bg-ds-surface-sunken hover:text-ds-ink'

/**
 * La Navbar del design: 64px su surface-raised con hairline sotto, marchio, cinque voci e due
 * azioni (Accedi in ghost, Inizia gratis in primary). Sotto lg un pulsante apre il menu a colonna.
 *
 * Con `accountActions={false}` la barra resta senza le due azioni: è quella che SiteShell mostra
 * finché non sa se chi legge è entrato (nell'HTML del server e mentre /auth/me risponde), così a
 * chi è entrato non compare «Accedi» prima della barra dell'app (ClickUp «Controllo Navbar»).
 *
 * §14.358: «Offerte» ha sotto le tre pagine (benvenuto, ricorrenti, esclusive), come nella barra
 * dell'app: una tendina al passaggio del mouse, una riga che si espande nel menu del telefono.
 *
 * §14.360: come nella barra dell'app, le voci stanno a destra accanto ad Accedi e Inizia gratis
 * (o in fondo alla barra, quando le due azioni non ci sono).
 */
export function LandingNav({ accountActions = true }: { accountActions?: boolean }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
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

        <nav aria-label="Principale" className="hidden min-w-0 flex-1 lg:block">
          <ul className="flex items-center justify-end-safe gap-1">
            {LANDING_NAV_LINKS.map((link) => {
              const active = isCurrentSection(link.href, pathname)
              return (
                <li key={link.href}>
                  {link.children ? (
                    <NavHoverMenu
                      label={link.label}
                      items={link.children}
                      active={active}
                      pathname={pathname}
                    />
                  ) : (
                    <Link
                      href={link.href}
                      aria-current={active ? 'page' : undefined}
                      className={dsNavLinkClass(active)}
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>

        {accountActions && (
          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            <DsButton href={LANDING_ROUTES.login} variant="ghost">
              {BRAND.login}
            </DsButton>
            <DsButton href={LANDING_ROUTES.register} variant="primary">
              {BRAND.signup}
            </DsButton>
          </div>
        )}

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
            {LANDING_NAV_LINKS.map((link) => {
              const active = isCurrentSection(link.href, pathname)
              return link.children ? (
                <NavExpandable
                  key={link.href}
                  label={link.label}
                  items={link.children}
                  active={active}
                  pathname={pathname}
                  onNavigate={close}
                  rowClassName={cn(MENU_ROW, dsFocusRing)}
                />
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={close}
                  aria-current={active ? 'page' : undefined}
                  className={cn(MENU_ROW, active && 'font-semibold text-ds-ink', dsFocusRing)}
                >
                  {link.label}
                </Link>
              )
            })}
            {accountActions && (
              <div className="mt-2 flex flex-col gap-2 border-t border-ds-line pt-3">
                <DsButton href={LANDING_ROUTES.login} variant="ghost" block>
                  {BRAND.login}
                </DsButton>
                <DsButton href={LANDING_ROUTES.register} variant="primary" block>
                  {BRAND.signup}
                </DsButton>
              </div>
            )}
          </DsContainer>
        </div>
      )}
    </header>
  )
}
