import { cn } from '@/lib/utils'
import { DsContainer, DsEyebrow, dsFocusRing } from '@/components/landing/ds-primitives'

export interface LegalSection {
  id: string
  title: string
  body: React.ReactNode
}

/**
 * Pagina legale (privacy, termini, cookie) sui token del design system: a sinistra eyebrow,
 * titolo in display, data e indice numerato che resta fisso da lg; a destra le sezioni separate
 * da hairline, numerate nell'ordine dell'indice.
 */
export function LegalPage({
  eyebrow = 'Legale',
  title,
  updated,
  sections,
}: {
  eyebrow?: string
  title: string
  updated: string
  sections: readonly LegalSection[]
}) {
  return (
    <DsContainer className="py-16 lg:py-24">
      <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
        <div className="flex flex-col gap-6 lg:sticky lg:top-8 lg:w-[280px] lg:shrink-0 lg:self-start">
          <div className="flex flex-col gap-3">
            <DsEyebrow>{eyebrow}</DsEyebrow>
            <h1 className="ds-display">{title}</h1>
            <p className="ds-body-sm text-ds-ink-muted">Ultimo aggiornamento: {updated}</p>
          </div>
          <nav aria-label="Indice">
            <ol className="flex flex-col gap-2 border-t border-ds-line pt-5">
              {sections.map((section, i) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className={cn(
                      'ds-body-sm flex gap-3 rounded-sm text-ds-ink-muted transition-colors hover:text-ds-ink',
                      dsFocusRing,
                    )}
                  >
                    <span className="tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                    <span>{section.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        <div className="flex w-full max-w-[680px] flex-col divide-y divide-ds-line lg:flex-1">
          {sections.map((section, i) => (
            <section
              key={section.id}
              id={section.id}
              className="flex scroll-mt-8 flex-col gap-3 py-8 first:pt-0 last:pb-0"
            >
              <h2 className="ds-heading">
                {i + 1}. {section.title}
              </h2>
              <div className="ds-body flex flex-col gap-3 text-ds-ink-muted">{section.body}</div>
            </section>
          ))}
        </div>
      </div>
    </DsContainer>
  )
}
