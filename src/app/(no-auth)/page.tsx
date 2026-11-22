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
 *
 * §14.363 (richiesta di Emanuele): chi è entrato resta sulla landing e la legge con la barra
 * dell'app, senza Accedi e Inizia gratis (SiteShell); prima RedirectIfLoggedIn lo mandava alla
 * dashboard. La pagina resta resa dal server per tutti, come per i motori di ricerca.
 */
export default function Page() {
  return (
    <SiteShell narrow>
      <HeroSection />
      <HowItWorksSection />
      <OddsmatcherSection />
      <CalculatorSection />
      <PricingSection />
      <FaqSection />
      <TrustSection />
    </SiteShell>
  )
}
