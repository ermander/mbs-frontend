import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Container } from '@/components/ui/container'
import { ProfitTrackerNav } from '@/components/profit-tracker/profit-tracker-nav'

export default function ProfitTrackerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="py-8 sm:py-12">
        <Container className="max-w-6xl space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Profit Tracker</h1>
            <p className="text-sm text-muted-foreground">
              Traccia in modo ordinato giocate, conti, wallet e movimenti.
            </p>
          </div>
          <ProfitTrackerNav />
          {children}
        </Container>
      </main>
      <Footer />
    </>
  )
}
