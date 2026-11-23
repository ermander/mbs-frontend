import { Suspense } from 'react'

import { SectionGuard } from '@/components/auth/section-guard'
import { GiocateDsShell } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { BestOddsTool } from '@/components/strumenti/best-odds/best-odds-tool'

/**
 * «Best Odds» (ADAPTER_STATUS §14.391, ClickUp «Best Odds»): chi quota un mercato di un evento e
 * chi paga di più, scendendo da sport, nazione e campionato. Sta nella tendina «Radar» con
 * l'Oddsmatcher e ne segue la sezione: chi è entrato senza la sezione vede «Sezione non abilitata».
 * La pagina legge il suo stato dall'indirizzo (useSearchParams), da cui il Suspense.
 */
export default function BestOddsPage() {
  return (
    <SectionGuard section="oddsmatcher">
      <GiocateDsShell>
        <Suspense fallback={null}>
          <BestOddsTool />
        </Suspense>
      </GiocateDsShell>
    </SectionGuard>
  )
}
