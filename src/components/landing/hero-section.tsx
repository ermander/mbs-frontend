import Link from 'next/link'
import Image from 'next/image'

import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { LandingSection } from '@/components/landing/landing-section'

export function HeroSection() {
  return (
    <LandingSection>
      <Container className="flex flex-col items-center text-center">
        <Image
          src="/loghi/mbs-icon.svg"
          alt="MBS"
          width={64}
          height={64}
          className="mb-6 h-16 w-16"
        />
        <h1 className="text-5xl font-bold tracking-[-0.04em] text-foreground sm:text-6xl md:text-7xl">
          <span className="text-gradient-primary">Matched betting</span> e strumenti per le{' '}
          <span className="text-gradient-primary">quote</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Confronta le quote, usa i calcolatori e massimizza i guadagni in modo legale e
          controllato. Inizia gratis.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:gap-6">
          <Button size="lg" asChild>
            <Link href="/registrazione">Registrati gratis</Link>
          </Button>
          <Button variant="glass" size="lg" asChild>
            <Link href="/#come-funziona">Scopri come funziona</Link>
          </Button>
        </div>
      </Container>
    </LandingSection>
  )
}
