import { Check } from 'lucide-react'

import { LANDING_ROUTES, PRICING } from '@/lib/landing-content'
import { DsBadge } from '@/components/landing/ds-data'
import { DsButton, DsCard, DsContainer } from '@/components/landing/ds-primitives'

/**
 * «Prezzi» (#prezzi): fascia su surface-raised; a sinistra i due paragrafi, a destra la card del
 * piano con il badge «Gratuito», i quattro punti con la spunta e la CTA primaria a tutta larghezza.
 */
export function PricingSection() {
  const { plan } = PRICING
  return (
    <section
      id="prezzi"
      className="mt-16 scroll-mt-4 border-y border-ds-line bg-ds-surface-raised py-16"
    >
      <DsContainer className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-16">
        <div>
          <h2 className="ds-title">{PRICING.title}</h2>
          <p className="ds-body-lg mt-4 max-w-[52ch] text-ds-ink-muted [text-wrap:pretty]">
            {PRICING.text}
          </p>
          <p className="ds-body mt-3 max-w-[52ch] text-ds-ink-muted [text-wrap:pretty]">
            {PRICING.text2}
          </p>
        </div>

        <DsCard size="lg">
          <div className="flex items-center justify-between gap-3">
            <span className="ds-heading">{plan.name}</span>
            <DsBadge tone="brand">{plan.badge}</DsBadge>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="ds-num-xl">{plan.price}</span>
            <span className="ds-body-sm text-ds-ink-muted">{plan.priceNote}</span>
          </div>
          <ul className="ds-body mt-5 flex flex-col gap-2.5">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-center gap-2.5">
                <Check className="h-5 w-5 shrink-0" aria-hidden />
                {feature}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <DsButton href={LANDING_ROUTES.register} variant="primary" block iconEnd="arrow-right">
              {plan.cta}
            </DsButton>
          </div>
          <p className="ds-caption mt-3 text-ds-ink-muted">{plan.caption}</p>
        </DsCard>
      </DsContainer>
    </section>
  )
}
