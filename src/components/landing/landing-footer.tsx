import Link from 'next/link'

import { BRAND, FOOTER, LANDING_FOOTER_LINKS, LANDING_ROUTES } from '@/lib/landing-content'
import { cn } from '@/lib/utils'
import {
  LandingContainer,
  Wordmark,
  landingFocusRing,
} from '@/components/landing/landing-primitives'

export function LandingFooter() {
  return (
    <footer className="mt-auto border-t border-ow-line pb-10 pt-8">
      <LandingContainer className="flex flex-col gap-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <Link
            href={LANDING_ROUTES.home}
            aria-label={BRAND.name}
            className={cn('flex items-center gap-2 self-start rounded-ow-btn', landingFocusRing)}
          >
            <Wordmark size="footer" />
          </Link>
          <nav aria-label="Piè di pagina" className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
            {LANDING_FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-ow-btn text-ow-text-3 transition-colors hover:text-ow-text',
                  landingFocusRing,
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="max-w-[980px] text-xs leading-[1.6] text-ow-text-3">{FOOTER.disclaimer}</p>
      </LandingContainer>
    </footer>
  )
}
