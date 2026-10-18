import { ShieldCheck } from 'lucide-react'

import { HERO, LANDING_ROUTES } from '@/lib/landing-content'
import { DsMoney } from '@/components/landing/ds-data'
import { DsButton, DsCard, DsContainer } from '@/components/landing/ds-primitives'

/**
 * Hero del design: titolo display-xl con la frase chiave sottolineata in accento, testo in
 * body-lg, CTA primaria e secondaria da 48px, riga di rassicurazione con lo scudo; a destra la
 * card «Profitto stimato del primo mese». Sotto lg le due colonne si impilano.
 */
export function HeroSection() {
  const { estimate } = HERO
  return (
    <section id="top" className="pb-12 pt-12 lg:pb-16 lg:pt-24">
      <DsContainer className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <h1 className="ds-display-xl">
            {HERO.titleBefore}
            <span className="underline decoration-ds-accent decoration-[6px] underline-offset-[6px]">
              {HERO.titleMark}
            </span>
            {HERO.titleAfter}
          </h1>
          <p className="ds-body-lg mt-6 max-w-[68ch] text-ds-ink-muted">{HERO.text}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <DsButton href={LANDING_ROUTES.guide} variant="primary" size="lg" iconEnd="arrow-right">
              {HERO.ctaPrimary}
            </DsButton>
            <DsButton href={LANDING_ROUTES.oddsmatcher} size="lg">
              {HERO.ctaSecondary}
            </DsButton>
          </div>
          <p className="ds-body-sm mt-4 flex items-center gap-2 text-ds-ink-muted">
            <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden />
            {HERO.reassurance}
          </p>
        </div>

        <DsCard size="lg" title={estimate.title}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="ds-label uppercase text-ds-ink-muted">{estimate.profitLabel}</span>
              <div className="mt-1">
                <DsMoney value={estimate.profit} size="xl" />
              </div>
            </div>
            <div>
              <span className="ds-label uppercase text-ds-ink-muted">{estimate.timeLabel}</span>
              <div className="ds-num-xl mt-1">{estimate.time}</div>
            </div>
          </div>
          <p className="ds-body-sm mt-5 text-ds-ink-muted">{estimate.note}</p>
        </DsCard>
      </DsContainer>
    </section>
  )
}
