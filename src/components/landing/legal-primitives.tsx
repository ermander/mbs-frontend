import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import { DsContainer, DsEyebrow, dsFocusRing } from '@/components/landing/ds-primitives'

export interface LegalSection {
  id: string
  title: string
  body: React.ReactNode
}

/**
 * Pagina legale (privacy, termini, cookie) dal design «OddWise Privacy» di Claude Design: a
 * sinistra la colonna di lettura da 720px con eyebrow, titolo in display, data e sezioni numerate
 * in body-lg (paragrafi ed elenchi a 68ch, le tabelle a tutta colonna); a destra, da lg, l'indice
 * da 280px su filetto verticale che resta fisso. Sul telefono l'indice sta fra l'intestazione e il
 * testo.
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
    <DsContainer className="pb-24 pt-16">
      <div className="grid gap-y-10 [grid-template-areas:'head'_'toc'_'body'] lg:grid-cols-[minmax(0,720px)_280px] lg:justify-between lg:gap-x-16 lg:gap-y-0 lg:[grid-template-areas:'head_toc'_'body_toc']">
        <header className="min-w-0 [grid-area:head]">
          <DsEyebrow>{eyebrow}</DsEyebrow>
          <h1 className="ds-display mt-3 text-pretty">{title}</h1>
          <p className="ds-body-sm mt-3 text-ds-ink-muted">Ultimo aggiornamento: {updated}</p>
        </header>

        <nav aria-label="Indice" className="[grid-area:toc] lg:sticky lg:top-6 lg:self-start">
          <div className="ds-label mb-3 uppercase text-ds-ink-muted">Indice</div>
          <ol className="flex flex-col border-l border-ds-line">
            {sections.map((section, i) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className={cn(
                    'ds-body-sm -ml-px flex gap-2.5 border-l-2 border-transparent py-1.5 pl-4 text-ds-ink-muted transition-colors hover:border-ds-brand hover:text-ds-brand',
                    dsFocusRing,
                  )}
                >
                  <span className="ds-num-sm text-ds-ink-faint">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>{section.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="min-w-0 [grid-area:body] lg:mt-12">
          {sections.map((section, i) => (
            <section key={section.id} id={section.id} className="mt-10 scroll-mt-6 first:mt-0">
              <h2 className="ds-heading">
                {i + 1}. {section.title}
              </h2>
              <div className="ds-body-lg mt-3 flex flex-col gap-4 text-pretty text-ds-ink [&>:is(p,ul,ol)]:max-w-[68ch]">
                {section.body}
              </div>
            </section>
          ))}

          <div className="mt-14 border-t border-ds-line pt-6">
            <Link
              href="/"
              className={cn(
                'ds-body inline-flex items-center gap-2 rounded-ds-sm text-ds-brand transition-colors hover:text-ds-brand-hover',
                dsFocusRing,
              )}
            >
              Torna alla home
              <ArrowRight className="size-5" strokeWidth={2} aria-hidden />
            </Link>
          </div>
        </article>
      </div>
    </DsContainer>
  )
}
