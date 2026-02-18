import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'

export function HeroSection() {
  return (
    <section className="py-20 sm:py-28">
      <Container className="flex flex-col items-center text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Matched betting e strumenti per le quote
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
