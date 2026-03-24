import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'

export function HeroSection() {
  return (
    <section className="relative py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(82,254,202,0.08)_0%,_transparent_70%)]" />
      <Container className="relative flex flex-col items-center text-center">
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
    </section>
  )
}
