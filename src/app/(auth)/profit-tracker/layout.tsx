import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Container } from '@/components/ui/container'

export default function ProfitTrackerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="pb-8 pt-4 sm:pb-12 sm:pt-6">
        <Container className="max-w-screen-2xl">{children}</Container>
      </main>
      <Footer />
    </>
  )
}
