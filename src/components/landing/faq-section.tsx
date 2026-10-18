import { FAQ } from '@/lib/landing-content'
import { DsContainer } from '@/components/landing/ds-primitives'

/** «Domande frequenti»: quattro coppie domanda/risposta su due colonne da lg, separate da hairline. */
export function FaqSection() {
  return (
    <section id="faq" className="pt-16">
      <DsContainer>
        <h2 className="ds-title mb-2">{FAQ.title}</h2>
        <div className="grid gap-x-16 lg:grid-cols-2">
          {FAQ.items.map((item) => (
            <div key={item.q} className="border-b border-ds-line py-5">
              <h3 className="ds-subheading">{item.q}</h3>
              <p className="ds-body mt-1.5 text-ds-ink-muted [text-wrap:pretty]">{item.a}</p>
            </div>
          ))}
        </div>
      </DsContainer>
    </section>
  )
}
