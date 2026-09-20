import { Eyebrow, LandingContainer } from '@/components/landing/landing-primitives'

export interface LegalSection {
  id: string
  title: string
  body: React.ReactNode
}

/**
 * Pagina legale (privacy, termini, cookie): a sinistra titolo, data e indice numerato che resta
 * fisso da lg; a destra le sezioni separate da hairline, numerate nell'ordine dell'indice.
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
    <LandingContainer className="py-16 lg:py-24">
      <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
        <div className="flex flex-col gap-6 lg:sticky lg:top-8 lg:w-[280px] lg:shrink-0 lg:self-start">
          <div className="flex flex-col gap-3">
            <Eyebrow>{eyebrow}</Eyebrow>
            <h1 className="text-[32px] font-medium leading-[1.1] tracking-[-0.022em] text-ow-text lg:text-[40px]">
              {title}
            </h1>
            <p className="text-[13px] text-ow-text-3">Ultimo aggiornamento: {updated}</p>
          </div>
          <nav aria-label="Indice">
            <ol className="flex flex-col gap-2 border-t border-ow-line pt-5">
              {sections.map((section, i) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="flex gap-3 rounded-sm text-[13px] text-ow-text-3 transition-colors hover:text-ow-text"
                  >
                    <span className="font-ow-mono tabular-nums">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span>{section.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        <div className="flex w-full max-w-[680px] flex-col divide-y divide-ow-line lg:flex-1">
          {sections.map((section, i) => (
            <section
              key={section.id}
              id={section.id}
              className="flex scroll-mt-8 flex-col gap-3 py-8 first:pt-0 last:pb-0"
            >
              <h2 className="text-lg font-medium tracking-[-0.012em] text-ow-text lg:text-xl">
                {i + 1}. {section.title}
              </h2>
              <div className="flex flex-col gap-3 text-[15px] leading-[1.7] text-ow-text-3">
                {section.body}
              </div>
            </section>
          ))}
        </div>
      </div>
    </LandingContainer>
  )
}
