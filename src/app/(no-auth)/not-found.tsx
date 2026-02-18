import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="py-12 sm:py-16">
        <Container className="max-w-md space-y-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">404</h1>
          <h2 className="text-2xl font-semibold text-foreground">Pagina non trovata</h2>
          <p className="text-muted-foreground">
            La pagina che cerchi non esiste o è stata spostata.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link href="/">Torna alla home</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/contatti">Contatti</Link>
            </Button>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  )
}
