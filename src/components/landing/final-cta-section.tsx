import { FINAL_CTA, LANDING_ROUTES } from '@/lib/landing-content'
import { LandingButton, LandingContainer } from '@/components/landing/landing-primitives'

export function FinalCtaSection() {
  return (
    <section className="pb-16 pt-0 lg:pb-24">
      <LandingContainer>
        <div className="flex flex-col gap-6 rounded-ow-card border border-ow-line bg-ow-surface p-6 text-ow-text sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:px-12 lg:py-14">
          <div className="flex flex-col gap-3 lg:max-w-[680px]">
            <h2 className="text-[30px] font-medium leading-[1.1] tracking-[-0.022em] lg:text-[40px]">
              {FINAL_CTA.title}
            </h2>
            <p className="text-[15px] leading-[1.6] text-ow-text-3 lg:text-base">
              {FINAL_CTA.text}
            </p>
          </div>
          <LandingButton
            href={LANDING_ROUTES.register}
            variant="accent"
            className="h-10 w-full sm:h-9 lg:w-auto lg:shrink-0"
          >
            {FINAL_CTA.cta}
          </LandingButton>
        </div>
      </LandingContainer>
    </section>
  )
}
