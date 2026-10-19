import { Lightbulb } from 'lucide-react'

import { HOW_IT_WORKS } from '@/lib/landing-content'
import { DsContainer } from '@/components/landing/ds-primitives'

/**
 * «Come funziona, in quattro passi»: fascia su surface-raised con hairline sopra e sotto; a
 * sinistra gli Steps del design (marcatore tondo, linea verticale fra un passo e l'altro), a
 * destra il Callout «tip» in brand-soft.
 */
export function HowItWorksSection() {
  return (
    <section id="come-funziona" className="border-y border-ds-line bg-ds-surface-raised py-16">
      <DsContainer>
        <h2 className="ds-title mb-8">{HOW_IT_WORKS.title}</h2>
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <ol className="flex flex-col">
            {HOW_IT_WORKS.steps.map((step, i) => (
              <li
                key={step.title}
                className="relative flex gap-4 pb-6 before:absolute before:bottom-1 before:left-[13px] before:top-8 before:w-0.5 before:bg-ds-line last:pb-0 last:before:hidden"
              >
                <span
                  aria-hidden
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-transparent bg-ds-surface-sunken text-sm font-semibold text-ds-ink-muted"
                >
                  {i + 1}
                </span>
                <div className="flex flex-col gap-1 pt-0.5">
                  <span className="ds-subheading">{step.title}</span>
                  <span className="ds-body-sm text-ds-ink-muted">{step.description}</span>
                </div>
              </li>
            ))}
          </ol>

          <div className="flex gap-3 self-start rounded-ds-md bg-ds-brand-soft p-4">
            <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-ds-brand" aria-hidden />
            <div>
              <p className="ds-subheading mb-1 text-ds-brand">{HOW_IT_WORKS.callout.title}</p>
              <p className="ds-body text-ds-ink">{HOW_IT_WORKS.callout.text}</p>
            </div>
          </div>
        </div>
      </DsContainer>
    </section>
  )
}
