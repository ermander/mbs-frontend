import Link from 'next/link'

import { BRAND, FOOTER, LANDING_FOOTER_COLUMNS, LANDING_ROUTES } from '@/lib/landing-content'
import { cn } from '@/lib/utils'
import { DsContainer, DsWordmark, dsFocusRing } from '@/components/landing/ds-primitives'

/** Piè di pagina del design: marchio con tagline, link in body-sm su tre colonne (due sul telefono), avvertenza in caption sotto un'hairline. */
export function LandingFooter() {
  return (
    <footer className="mt-auto border-t border-ds-line bg-ds-surface-raised">
      <DsContainer className="flex flex-col gap-5 py-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <Link
            href={LANDING_ROUTES.home}
            aria-label={BRAND.name}
            className={cn('rounded-ds-sm', dsFocusRing)}
          >
            <DsWordmark size="md" tagline={BRAND.tagline} />
          </Link>
          <nav
            aria-label="Piè di pagina"
            className="ds-body-sm grid grid-cols-2 gap-x-10 gap-y-2 text-ds-ink-muted sm:grid-cols-3"
          >
            {LANDING_FOOTER_COLUMNS.map((column) => (
              <ul key={column[0].href} className="flex flex-col gap-2">
                {column.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={cn(
                        'rounded-sm transition-colors hover:text-ds-brand hover:underline',
                        dsFocusRing,
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
          </nav>
        </div>
        <p className="ds-caption max-w-[68ch] border-t border-ds-line pt-5 text-ds-ink-muted [text-wrap:pretty]">
          {FOOTER.disclaimer}
        </p>
      </DsContainer>
    </footer>
  )
}
