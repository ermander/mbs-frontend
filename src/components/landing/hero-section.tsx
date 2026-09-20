import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { HERO, LANDING_ROUTES } from '@/lib/landing-content'
import { cn } from '@/lib/utils'
import { CalculatorCard } from '@/components/landing/calculator-card'
import {
  LandingButton,
  LandingContainer,
  landingFocusRing,
} from '@/components/landing/landing-primitives'

/**
 * Hero: testo e CTA a sinistra, card del calcolatore a destra. Titolo in peso medio con
 * tracking stretto, testo in grigio, una sola CTA piena più un link con freccia. Sul telefono
 * occupa la prima schermata con la card compatta appoggiata al fondo.
 */
export function HeroSection() {
  return (
    <section id="top" className="flex min-h-[calc(100svh-4rem)] flex-col lg:block lg:min-h-0">
      <LandingContainer className="flex flex-1 flex-col pt-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:py-24 xl:gap-16">
        <div className="flex flex-col gap-4 lg:min-w-0 lg:max-w-[600px] lg:flex-1 lg:gap-6">
          <h1 className="text-[34px] font-medium leading-[1.08] tracking-[-0.022em] text-ow-text md:text-[44px] lg:text-[48px] lg:leading-[1.05] xl:text-[56px]">
            {HERO.title}
          </h1>
          <p className="max-w-[52ch] text-base leading-[1.6] text-ow-text-3">{HERO.text}</p>
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
            <LandingButton href={LANDING_ROUTES.promo} variant="accent" className="h-10 sm:h-9">
              {HERO.ctaPrimary}
            </LandingButton>
            <Link
              href={LANDING_ROUTES.how}
              className={cn(
                'inline-flex items-center gap-1.5 self-start rounded-ow-btn text-sm text-ow-text-2 transition-colors hover:text-ow-text',
                landingFocusRing,
              )}
            >
              {HERO.ctaSecondary}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>

        <div className="mt-8 flex flex-1 flex-col items-center justify-end md:pb-10 lg:mt-0 lg:flex-none lg:pb-0">
          <CalculatorCard />
        </div>
      </LandingContainer>
    </section>
  )
}
