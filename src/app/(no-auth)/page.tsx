import { RedirectIfLoggedIn } from '@/components/auth/redirect-if-logged-in'
import { SiteShell } from '@/components/landing/site-shell'
import { HeroSection } from '@/components/landing/hero-section'
import { WhyItWorksSection } from '@/components/landing/why-it-works-section'
import { PromoSection } from '@/components/landing/promo-section'
import { HowItWorksSection } from '@/components/landing/how-it-works-section'
import { MethodsSection } from '@/components/landing/methods-section'
import { EarningsSection } from '@/components/landing/earnings-section'
import { ToolsSection } from '@/components/landing/tools-section'
import { BettingSitesCarousel } from '@/components/landing/betting-sites-carousel'
import { MatchedBettingPlansSection } from '@/components/landing/matched-betting-plans-section'
import { SurebetPlansSection } from '@/components/landing/surebet-plans-section'
import { FaqSection } from '@/components/landing/faq-section'
import { FinalCtaSection } from '@/components/landing/final-cta-section'

/**
 * Landing OddWise: le sezioni nell'ordine del mockup approvato
 * (.claude/design/oddwise-handoff/landing-blue.dc.html), rese con la grammatica «Linear»
 * (token in globals.css: superfici neutre, hairline, raggi 6/12, un solo accento). Tema dark
 * di default, varianti con data-theme="green" | "light" sull'<html>.
 */
export default function Page() {
  return (
    <>
      <RedirectIfLoggedIn />
      <SiteShell>
        <HeroSection />
        <WhyItWorksSection />
        <PromoSection />
        <HowItWorksSection />
        <MethodsSection />
        <EarningsSection />
        <ToolsSection />
        <BettingSitesCarousel />
        <MatchedBettingPlansSection />
        <SurebetPlansSection />
        <FaqSection />
        <FinalCtaSection />
      </SiteShell>
    </>
  )
}
