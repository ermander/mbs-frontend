import type { LucideIcon } from 'lucide-react'

import { GiocateDsShell } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { DsEmptyState, DsPageHeader } from '@/components/profit-tracker/tracker-ds'

/**
 * Una sezione dell'app non ancora pronta (Guide, Forum) sul design OddWise (§14.361): il guscio
 * chiaro e la colonna delle altre pagine, il titolo della sezione e un riquadro «In costruzione»
 * con l'icona della voce della barra. Prima era testo centrato sul fondo scuro della grafica vecchia.
 */
export function DsComingSoonPage({
  title,
  description,
  icon: Icon,
}: {
  title: string
  description: string
  icon: LucideIcon
}) {
  return (
    <GiocateDsShell>
      <DsPageHeader title={title} />
      <DsEmptyState
        icon={<Icon className="h-8 w-8" strokeWidth={1.75} aria-hidden />}
        title="In costruzione"
        description={description}
      />
    </GiocateDsShell>
  )
}
