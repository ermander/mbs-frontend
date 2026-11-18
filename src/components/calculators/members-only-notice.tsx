import { Lock } from 'lucide-react'

import { DsButton } from '@/components/landing/ds-primitives'
import { CALCULATOR_TOOLS, GUEST_CALCULATORS, type CalculatorTool } from '@/lib/calculators/catalog'
import { LANDING_ROUTES } from '@/lib/landing-content'
import { loginHref } from '@/lib/auth-redirects'

/** «Punta-Banca, Punta-Punta e Roulette europea»: i nomi in fila all'italiana. */
function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`
}

const GUEST_NAMES = joinNames(
  CALCULATOR_TOOLS.filter((t) => GUEST_CALCULATORS.has(t.slug)).map((t) => t.name),
)

/**
 * §14.340: il corpo del pannello quando un ospite apre un calcolatore che non è fra quelli liberi
 * (GUEST_CALCULATORS): dice che è per gli iscritti, porta alla registrazione e, per chi ha già un
 * account, al login che riapre questo calcolatore (`?next=`).
 */
export function MembersOnlyNotice({ tool }: { tool: CalculatorTool }) {
  return (
    <div className="mx-auto flex max-w-[560px] flex-col items-center gap-5 py-10 text-center sm:py-16">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-ds-brand-soft text-ds-brand">
        <Lock className="h-6 w-6" aria-hidden />
      </span>
      <h2 className="ds-heading m-0">{tool.name} è riservato agli utenti iscritti</h2>
      <p className="ds-body m-0 text-ds-ink-muted">
        L&apos;iscrizione è gratuita: con un account usi tutti i calcolatori e salvi le giocate nel
        tracker. Senza account puoi già usare {GUEST_NAMES}.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <DsButton href={LANDING_ROUTES.register} variant="primary">
          Iscriviti gratis
        </DsButton>
        <DsButton href={loginHref(`/calcolatori?expand=${tool.slug}`)} variant="ghost">
          Ho già un account
        </DsButton>
      </div>
    </div>
  )
}
