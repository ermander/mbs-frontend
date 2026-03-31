import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { LandingSection } from '@/components/landing/landing-section'

export function CtaSection() {
  return (
    <LandingSection accent="blue-wash" hairlineTop>
      <Container className="flex flex-col items-center text-center">
        <h2 className="text-3xl font-bold tracking-[-0.03em] text-foreground sm:text-4xl">
          Pronto a iniziare?
        </h2>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Unisciti alla community e inizia a sfruttare gli strumenti per le quote. Registrazione
          gratuita, nessun impegno.
        </p>
        <Button size="lg" className="mt-8" asChild>
          <Link href="/registrazione">Inizia gratis</Link>
        </Button>
      </Container>
    </LandingSection>
  )
}
