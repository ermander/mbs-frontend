import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'

export function CtaSection() {
  return (
    <section className="py-20 sm:py-28">
      <Container className="flex flex-col items-center text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
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
    </section>
  )
}
