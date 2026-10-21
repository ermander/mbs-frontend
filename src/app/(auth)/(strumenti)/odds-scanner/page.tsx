import React from 'react'

import { dsSans, dsSerif } from '@/components/landing/landing-fonts'
import { OddsScannerV2 } from '@/components/strumenti/scanner-v2/odds-scanner-v2'
import { cn } from '@/lib/utils'

/**
 * L'Oddsmatcher dal design «OddWise Oddsmatcher» di Claude Design (§14.272): tema chiaro ds-* su
 * tutta l'altezza sotto la barra in alto, colonna da 1200px. Il ponte ds-calc-bridge rimappa sul
 * chiaro i pezzi shadcn rimasti nella pagina.
 */
export default function OddsScannerPage() {
  return (
    <div
      className={cn(
        dsSerif.variable,
        dsSans.variable,
        'ds-scope ds-calc-bridge -mx-4 -my-6 flex min-h-[calc(100vh-var(--topnav-h))] flex-col bg-ds-surface font-ds-sans text-base leading-6 tracking-normal text-ds-ink antialiased [color-scheme:light] md:-mx-8',
      )}
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-4 px-4 pb-16 pt-6 sm:px-6">
        <h1 className="sr-only">Oddsmatcher</h1>
        <OddsScannerV2 />
        <p className="ds-caption mt-auto pt-6 text-ds-ink-muted">
          Gioco vietato ai minori di 18 anni. Gioca responsabilmente.
        </p>
      </div>
    </div>
  )
}
