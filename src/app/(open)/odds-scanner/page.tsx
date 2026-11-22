import React from 'react'

import { dsSans, dsSerif } from '@/components/landing/landing-fonts'
import { OddsScannerV2 } from '@/components/strumenti/scanner-v2/odds-scanner-v2'
import { cn } from '@/lib/utils'
import { PAGE_COLUMN } from '@/lib/page-column'

/**
 * L'Oddsmatcher dal design «OddWise Oddsmatcher» di Claude Design (§14.272): tema chiaro ds-* su
 * tutta l'altezza sotto la barra in alto, colonna delle pagine (PAGE_COLUMN). Il ponte ds-calc-bridge rimappa sul
 * chiaro i pezzi shadcn rimasti nella pagina.
 *
 * §14.339: sta nel gruppo di rotte `(open)` (OpenAreaLayout): chi arriva dalla landing senza
 * account vede la versione gratuita (OddsScannerV2 legge l'utente dallo store), chi è entrato
 * l'oddsmatcher completo come prima.
 */
export default function OddsScannerPage() {
  return (
    <div
      className={cn(
        dsSerif.variable,
        dsSans.variable,
        'ds-scope ds-calc-bridge -mx-4 -my-6 flex min-h-[calc(100vh-var(--topnav-h))] flex-col bg-ds-surface font-ds-sans text-base leading-6 tracking-normal text-ds-ink antialiased scheme-light md:-mx-8',
      )}
    >
      <div className={cn(PAGE_COLUMN, 'flex flex-1 flex-col gap-4 pt-6 pb-16')}>
        <h1 className="sr-only">Oddsmatcher</h1>
        <OddsScannerV2 />
        <p className="ds-caption mt-auto pt-6 text-ds-ink-muted">
          Gioco vietato ai minori di 18 anni. Gioca responsabilmente.
        </p>
      </div>
    </div>
  )
}
