import Link from 'next/link'
import Image from 'next/image'

import { Button } from '@/components/ui/button'
import { Footer } from '@/components/layout/footer'
import { RedirectIfLoggedIn } from '@/components/auth/redirect-if-logged-in'
import { LandingPageBackdrop } from '@/components/landing/landing-page-backdrop'
import { HeroSection } from '@/components/landing/hero-section'
import { ValuePropositionSection } from '@/components/landing/value-proposition-section'
import { HowItWorksSection } from '@/components/landing/how-it-works-section'
import { FeaturesSection } from '@/components/landing/features-section'
import { SocialProofSection } from '@/components/landing/social-proof-section'
import { PricingSection } from '@/components/landing/pricing-section'
import { FaqSection } from '@/components/landing/faq-section'
import { CtaSection } from '@/components/landing/cta-section'

export default function Page() {
  return (
    <>
      <RedirectIfLoggedIn />
      <div className="relative isolate overflow-x-hidden">
        <LandingPageBackdrop />

        <header className="absolute inset-x-0 top-0 z-20 px-4 py-5 sm:px-8 sm:py-6">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <Link
              href="/"
              aria-label="Home"
              className="flex items-center gap-2 rounded-md px-1 text-base font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Image
                src="/loghi/mbs-icon.svg"
                alt=""
                width={28}
                height={28}
                className="h-7 w-7"
                priority
              />
              <span className="text-gradient-primary">MBS</span>
            </Link>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Accedi</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/registrazione">Registrati</Link>
              </Button>
            </div>
          </div>
        </header>

        <main>
          <HeroSection />
          <ValuePropositionSection />
          <HowItWorksSection />
          <FeaturesSection />
          <SocialProofSection />
          <PricingSection />
          <FaqSection />
          <CtaSection />
        </main>
      </div>
      <Footer />
    </>
  )
}
