'use client'

import { Lock } from 'lucide-react'

import { DsButton } from '@/components/landing/ds-primitives'
import { GiocateDsShell } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { DsEmptyState, DsPageHeader } from '@/components/profit-tracker/tracker-ds'
import { SECTIONS, SECTION_HOME, canUseSection, sectionLabel, type SectionKey } from '@/lib/tools'
import { useAuthStore } from '@/stores/auth-store'

/**
 * Le pagine di una sezione del sito che l'admin accende o spegne per utente dal backoffice
 * (§14.366; per «Risultato + Goal» c'era ToolAuthGuard dal §14.122). Chi è entrato senza la
 * sezione vede «Sezione non abilitata» al posto della pagina, con i link alle sezioni che ha;
 * un ospite (nessun utente, pagine del gruppo `(open)`) vede la pagina come prima, nella sua
 * versione gratuita. Il backend rifiuta comunque le chiamate della sezione con un 403.
 */
export function SectionGuard({
  section,
  children,
}: {
  section: SectionKey
  children: React.ReactNode
}) {
  const user = useAuthStore((s) => s.user)
  if (user && !canUseSection(user, section)) return <SectionNotEnabled section={section} />
  return <>{children}</>
}

/** La pagina al posto di una sezione spenta: il titolo della sezione, il lucchetto e dove andare. */
export function SectionNotEnabled({ section }: { section: SectionKey }) {
  const user = useAuthStore((s) => s.user)
  const others = SECTIONS.filter((s) => s.key !== section && canUseSection(user, s.key))
  return (
    <GiocateDsShell>
      <DsPageHeader title={sectionLabel(section)} />
      <DsEmptyState
        icon={<Lock className="h-8 w-8" strokeWidth={1.75} aria-hidden />}
        title="Sezione non abilitata"
        description="Questa sezione non è abilitata per il tuo account. Se pensi che sia un errore, scrivici dalla pagina Contatti."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            {others.map((s) => (
              <DsButton key={s.key} href={SECTION_HOME[s.key]} variant="secondary" size="sm">
                {s.label}
              </DsButton>
            ))}
            <DsButton href="/contatti" variant="ghost" size="sm">
              Contatti
            </DsButton>
          </div>
        }
      />
    </GiocateDsShell>
  )
}
