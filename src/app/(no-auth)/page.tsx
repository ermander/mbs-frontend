import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
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
      <Header />
      <main className="relative isolate overflow-x-hidden">
        <LandingPageBackdrop />
        <HeroSection />
        <ValuePropositionSection />
        <HowItWorksSection />
        <FeaturesSection />
        <SocialProofSection />
        <PricingSection />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  )
}
