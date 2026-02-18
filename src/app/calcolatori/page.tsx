import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Container } from '@/components/ui/container'

export default function CalcolatoriPage() {
  return (
    <>
      <Header />
      <main className="py-12 sm:py-16">
        <Container className="max-w-3xl space-y-4 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Calcolatori</h1>
          <p className="text-muted-foreground">In costruzione.</p>
        </Container>
      </main>
      <Footer />
    </>
  )
}
