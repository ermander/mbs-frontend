import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Container } from '@/components/ui/container'
import { MultiplaOfflineCalculator } from '@/components/calculators/MultiplaOfflineCalculator'

export default function MultiplaOfflinePage() {
  return (
    <>
      <Header />
      <main className="py-12 sm:py-16">
        <Container className="max-w-4xl space-y-8">
          <h1 className="text-center text-3xl font-bold tracking-tight text-foreground">
            Calcolatore <br className="md:hidden" />
            <span className="whitespace-nowrap">Multipla</span>
          </h1>
          <MultiplaOfflineCalculator />
        </Container>
      </main>
      <Footer />
    </>
  )
}
