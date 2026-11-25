import React from 'react'

import { SectionGuard } from '@/components/auth/section-guard'
import { dsSans, dsSerif } from '@/components/landing/landing-fonts'
import { OddsScannerV2 } from '@/components/strumenti/scanner-v2/odds-scanner-v2'
import { cn } from '@/lib/utils'
import { PAGE_COLUMN } from '@/lib/page-column'

/**
 * Il Trimatcher (ADAPTER_STATUS §14.406, ClickUp «Separare Oddsmatcher, Dutcher e Trimatcher»): lo
 * scanner dell'Oddsmatcher con le sole combinazioni punta-punta sui tre esiti di un mercato, nella
 * tendina «Radar». Stessa colonna e stesso tema della pagina dell'Oddsmatcher (/odds-scanner).
 * Segue la sezione `oddsmatcher` come tutta la tendina: chi è entrato senza la sezione vede
 * «Sezione non abilitata». Niente versione gratuita: sta in `(auth)`, chi non è entrato va al login.
 */
export default function TrimatcherPage() {
  return (
    <SectionGuard section="oddsmatcher">
      <div
        className={cn(
          dsSerif.variable,
          dsSans.variable,
          'ds-scope ds-calc-bridge -mx-4 -my-6 flex min-h-[calc(100vh-var(--topnav-h))] flex-col bg-ds-surface font-ds-sans text-base leading-6 tracking-normal text-ds-ink antialiased scheme-light md:-mx-8',
        )}
      >
        <div className={cn(PAGE_COLUMN, 'flex flex-1 flex-col gap-4 pt-6 pb-16')}>
          <OddsScannerV2 page="trimatcher" />
          <p className="ds-caption mt-auto pt-6 text-ds-ink-muted">
            Gioco vietato ai minori di 18 anni. Gioca responsabilmente.
          </p>
        </div>
      </div>
    </SectionGuard>
  )
}
