import { RedirectIfLoggedIn } from '@/components/auth/redirect-if-logged-in'
import { SiteShell } from '@/components/landing/site-shell'
import { HeroSection } from '@/components/landing/hero-section'
import { HowItWorksSection } from '@/components/landing/how-it-works-section'
import { OddsmatcherSection } from '@/components/landing/oddsmatcher-section'
import { CalculatorSection } from '@/components/landing/calculator-section'
import { PricingSection } from '@/components/landing/pricing-section'
import { FaqSection } from '@/components/landing/faq-section'
import { TrustSection } from '@/components/landing/trust-section'

/**
 * Landing OddWise: le sezioni nell'ordine del design fatto con Claude Design (artifact
 * 6yv6CKdzp9n9Ei2SAWNmwH, §14.248), rese con i token ds-* di globals.css (tema chiaro, serif per i
 * titoli, brand verde, accento lime solo sulla frase chiave del titolo). Variante scura con
 * data-theme="dark" sull'<html>.
 */
export default function Page() {
  return (
    <>
      <RedirectIfLoggedIn />
      <SiteShell>
        <HeroSection />
        <HowItWorksSection />
        <OddsmatcherSection />
        <CalculatorSection />
        <PricingSection />
        <FaqSection />
        <TrustSection />
      </SiteShell>
    </>
  )
}
