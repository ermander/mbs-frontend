import { LANDING_ROUTES, type Plan } from '@/lib/landing-content'
import { cn } from '@/lib/utils'
import { LandingButton } from '@/components/landing/landing-primitives'

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M3 7.3l2.6 2.6L11 4.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Card di un piano: stessa superficie per tutti, bordo in accento e CTA piena solo per il
 * piano in evidenza; gli altri hanno il pulsante secondario. `size` lg = piani matched
 * betting, md = piani surebet.
 */
export function PlanCard({ plan, size }: { plan: Plan; size: 'lg' | 'md' }) {
  const lg = size === 'lg'
  return (
    <div
      className={cn(
        'flex flex-col rounded-ow-card border bg-ow-surface text-ow-text',
        plan.highlighted ? 'border-ow-deep-border' : 'border-ow-line',
        lg ? 'gap-5 p-6 lg:min-h-[560px] lg:p-7' : 'gap-4 p-6 lg:min-h-[380px]',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className={cn('font-medium tracking-[-0.012em]', lg ? 'text-xl' : 'text-lg')}>
          {plan.name}
        </h3>
        {plan.badge && (
          <span className="shrink-0 rounded border border-ow-line-strong px-1.5 py-0.5 text-xs text-ow-text-2">
            {plan.badge}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span
          className={cn(
            'whitespace-nowrap font-ow-mono font-medium tabular-nums leading-none',
            lg ? 'text-[36px]' : 'text-[32px]',
          )}
        >
          {plan.price}
        </span>
        {plan.period && <span className="text-[13px] text-ow-text-3">{plan.period}</span>}
      </div>
      <p className="text-[15px] leading-[1.6] text-ow-text-3">{plan.subtitle}</p>
      <ul className="flex flex-col gap-2.5 border-t border-ow-line pt-5">
        {plan.features.map((feature) => (
          <li
            key={feature.label}
            className={cn(
              'flex items-start gap-2.5 text-sm leading-[1.5]',
              feature.included ? 'text-ow-text-2' : 'text-ow-text-3',
            )}
          >
            <span
              className={cn(
                'mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center',
                feature.included ? 'text-ow-text' : 'text-ow-check-off',
              )}
            >
              <CheckIcon />
            </span>
            <span>
              <span className="sr-only">{feature.included ? 'Incluso: ' : 'Non incluso: '}</span>
              {feature.label}
            </span>
          </li>
        ))}
      </ul>
      <LandingButton
        href={LANDING_ROUTES.register}
        variant={plan.highlighted ? 'accent' : 'ghost'}
        className="mt-auto w-full"
      >
        {plan.cta}
      </LandingButton>
    </div>
  )
}
