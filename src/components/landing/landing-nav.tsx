'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

import { BRAND, LANDING_NAV_LINKS, LANDING_ROUTES } from '@/lib/landing-content'
import { cn } from '@/lib/utils'
import {
  LandingButton,
  LandingContainer,
  Wordmark,
  landingFocusRing,
} from '@/components/landing/landing-primitives'

/** Link della nav: 13px grigio, si accende in bianco al passaggio (mai in accento). */
const linkClass = cn(
  'rounded-ow-btn px-3 py-1.5 text-[13px] text-ow-text-3 transition-colors hover:text-ow-text',
  landingFocusRing,
)

/**
 * Barra della landing: 64px, hairline sotto, link tipografici e una pillola neutra come CTA.
 * Sotto lg un pulsante apre il menu a colonna.
 */
export function LandingNav() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <header className="border-b border-ow-line bg-ow-bg">
      <LandingContainer className="flex h-16 items-center justify-between">
        <Link
          href={LANDING_ROUTES.home}
          aria-label={BRAND.name}
          className={cn('flex items-center gap-2 rounded-ow-btn', landingFocusRing)}
        >
          <Wordmark />
        </Link>

        <nav aria-label="Sezioni" className="hidden items-center gap-1 lg:flex">
          {LANDING_NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link href={LANDING_ROUTES.login} className={linkClass}>
            {BRAND.login}
          </Link>
          <LandingButton
            href={LANDING_ROUTES.promo}
            variant="neutral"
            className="h-8 rounded-ow-pill px-3 text-[13px]"
          >
            {BRAND.signup}
          </LandingButton>
        </div>

        <button
          type="button"
          aria-label={open ? BRAND.closeMenu : BRAND.openMenu}
          aria-expanded={open}
          aria-controls="landing-menu"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'inline-flex h-9 w-9 items-center justify-center rounded-ow-btn border border-ow-line-strong text-ow-text lg:hidden',
            landingFocusRing,
          )}
        >
          {open ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
        </button>
      </LandingContainer>

      {open && (
        <div id="landing-menu" className="border-t border-ow-line bg-ow-bg lg:hidden">
          <LandingContainer className="flex flex-col gap-0.5 py-3">
            {LANDING_NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                className={cn(
                  'rounded-ow-btn px-3 py-2.5 text-[15px] text-ow-text-2 hover:bg-ow-surface hover:text-ow-text',
                  landingFocusRing,
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-ow-line pt-3">
              <LandingButton href={LANDING_ROUTES.login} variant="ghost" className="h-10 w-full">
                {BRAND.login}
              </LandingButton>
              <LandingButton href={LANDING_ROUTES.promo} variant="accent" className="h-10 w-full">
                {BRAND.signup}
              </LandingButton>
            </div>
          </LandingContainer>
        </div>
      )}
    </header>
  )
}
