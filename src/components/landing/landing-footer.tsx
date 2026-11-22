import Link from 'next/link'

import {
  APP_FOOTER_COLUMNS,
  BRAND,
  FOOTER,
  LANDING_FOOTER_COLUMNS,
  LANDING_ROUTES,
} from '@/lib/landing-content'
import { cn } from '@/lib/utils'
import { DsContainer, DsWordmark, dsFocusRing } from '@/components/landing/ds-primitives'
import { dsSans, dsSerif } from '@/components/landing/landing-fonts'
import { LandingFooterLink } from '@/components/landing/landing-footer-link'

/**
 * Nell'area dell'app il guscio non ha i token ds-* né i font Source (le pagine li prendono da
 * DsPageShell, la barra da topnavDsScope): il piè di pagina se li porta da sé, come la Topnav.
 */
const APP_FOOTER_SCOPE = cn(
  dsSerif.variable,
  dsSans.variable,
  'ds-scope font-ds-sans text-base leading-6 tracking-normal text-ds-ink antialiased scheme-light',
)

/**
 * Piè di pagina del design: marchio con tagline, link in body-sm su tre colonne (due sul
 * telefono) con la pagina corrente segnata, avvertenza in caption sotto un'hairline.
 *
 * Con `inApp` è quello sotto le pagine di chi è entrato, nei layout di (auth) e di (open)
 * (§14.348): stesso aspetto, i link stanno in due colonne senza «Prezzi» (APP_FOOTER_COLUMNS). Il
 * marchio porta alla landing per tutti, come quello della Topnav (§14.362; prima, nell'app, alla
 * dashboard).
 */
export function LandingFooter({ inApp = false }: { inApp?: boolean }) {
  const columns = inApp ? APP_FOOTER_COLUMNS : LANDING_FOOTER_COLUMNS
  return (
    <footer
      className={cn(
        'mt-auto border-t border-ds-line bg-ds-surface-raised',
        inApp && APP_FOOTER_SCOPE,
      )}
    >
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
            className={cn(
              'ds-body-sm grid grid-cols-2 gap-x-10 gap-y-2 text-ds-ink-muted',
              !inApp && 'sm:grid-cols-3',
            )}
          >
            {columns.map((column) => (
              <ul key={column[0].href} className="flex flex-col gap-2">
                {column.map((link) => (
                  <li key={link.href}>
                    <LandingFooterLink href={link.href}>{link.label}</LandingFooterLink>
                  </li>
                ))}
              </ul>
            ))}
          </nav>
        </div>
        <p className="ds-caption max-w-[68ch] border-t border-ds-line pt-5 text-pretty text-ds-ink-muted">
          {FOOTER.disclaimer}
        </p>
      </DsContainer>
    </footer>
  )
}
