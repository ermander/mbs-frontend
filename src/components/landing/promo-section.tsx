import { LANDING_ROUTES, PROMO } from '@/lib/landing-content'
import { cn } from '@/lib/utils'
import { Eyebrow, LandingButton, LandingContainer } from '@/components/landing/landing-primitives'

export function PromoSection() {
  return (
    <section id="promo" className="py-16 lg:py-24">
      <LandingContainer>
        <div className="flex flex-col gap-8 rounded-ow-card border border-ow-line bg-ow-surface p-6 sm:p-8 lg:flex-row lg:items-center lg:gap-12 lg:p-10">
          <div className="flex flex-col gap-4 lg:w-[480px] lg:shrink-0">
            <Eyebrow>{PROMO.eyebrow}</Eyebrow>
            <h2 className="text-[30px] font-medium leading-[1.1] tracking-[-0.022em] text-ow-text lg:text-[40px]">
              {PROMO.title}
            </h2>
            <p className="text-[15px] leading-[1.6] text-ow-text-3 lg:text-base">{PROMO.text}</p>
            <LandingButton
              href={LANDING_ROUTES.register}
              variant="accent"
              className="mt-2 h-10 w-full sm:h-9 lg:w-auto lg:self-start"
            >
              {PROMO.cta}
            </LandingButton>
          </div>

          <ol className="flex flex-col gap-2 lg:flex-1">
            {PROMO.steps.map((step) => (
              <li
                key={step.n}
                className={cn(
                  'flex items-center gap-4 rounded-[8px] border px-4 py-3.5',
                  step.highlight ? 'border-ow-line-strong bg-ow-bg' : 'border-transparent bg-ow-bg',
                )}
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ow-line-strong font-ow-mono text-[13px] text-ow-text-2">
                  {step.n}
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-medium text-ow-text">{step.title}</span>
                  <span className="text-[13px] leading-[1.5] text-ow-text-3">{step.text}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </LandingContainer>
    </section>
  )
}
