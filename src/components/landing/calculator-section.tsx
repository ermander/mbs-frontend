import { formatMoney, formatOdds } from '@/lib/landing-format'
import { CALCULATOR, LANDING_ROUTES } from '@/lib/landing-content'
import { cn } from '@/lib/utils'
import { DsMoney } from '@/components/landing/ds-data'
import { DsButton, DsContainer } from '@/components/landing/ds-primitives'

/**
 * «Il calcolatore ti dice quanto bancare, al centesimo»: testo e CTA a sinistra, a destra il
 * CalcResult del design (bancata in num-xl, responsabilità e commissione, profitto per esito in
 * un riquadro profit-soft, o warning-soft quando un esito è in perdita, nota in caption).
 */
export function CalculatorSection() {
  const { example } = CALCULATOR
  const mixed = example.outcomes.some((o) => o.profit < 0)
  return (
    <section id="calcolatore" className="pt-16">
      <DsContainer className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-16">
        <div>
          <h2 className="ds-title">{CALCULATOR.title}</h2>
          <p className="ds-body-lg mt-4 text-ds-ink-muted">{CALCULATOR.text}</p>
          <div className="mt-6">
            <DsButton href={LANDING_ROUTES.calcolatori} iconEnd="arrow-right">
              {CALCULATOR.cta}
            </DsButton>
          </div>
        </div>

        <div
          aria-live="polite"
          className="flex flex-col gap-5 rounded-ds-lg border border-ds-line bg-ds-surface-raised p-6 shadow-ds-sm"
        >
          <div className="flex flex-col gap-1">
            <span className="ds-caption text-ds-ink-muted">{example.mainLabel}</span>
            <span className="ds-num-xl">{formatMoney(example.layStake, { sign: false })}</span>
            <span className="ds-body-sm text-ds-ink-muted">
              alla quota {formatOdds(example.lay.odds)} su {example.lay.exchange}
            </span>
          </div>
          <div className="ds-body-sm grid grid-cols-1 gap-3 text-ds-ink-muted sm:grid-cols-2 sm:gap-x-6">
            <div className="flex justify-between gap-3">
              <span>{example.liabilityLabel}</span>
              <DsMoney value={example.liability} neutral className="text-ds-ink" />
            </div>
            <div className="flex justify-between gap-3">
              <span>{example.commissionLabel}</span>
              <span className="font-semibold tabular-nums text-ds-ink">{example.commission}</span>
            </div>
          </div>
          <div
            className={cn(
              'grid grid-cols-2 gap-3 rounded-ds-md p-4',
              mixed ? 'bg-ds-warning-soft' : 'bg-ds-profit-soft',
            )}
          >
            {example.outcomes.map((outcome) => (
              <div key={outcome.label} className="flex flex-col gap-0.5">
                <span className="ds-caption text-ds-ink-muted">{outcome.label}</span>
                <DsMoney value={outcome.profit} />
              </div>
            ))}
          </div>
          <span className="ds-caption text-ds-ink-muted">{example.note}</span>
        </div>
      </DsContainer>
    </section>
  )
}
