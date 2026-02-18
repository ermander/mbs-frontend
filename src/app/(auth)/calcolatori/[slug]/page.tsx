import React from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Container } from '@/components/ui/container'
import { PuntaBancaCalculator } from '@/components/calculators/PuntaBancaCalculator'

const slugToTitle: Record<string, string> = {
  'punta-banca': 'Punta-Banca',
  'punta-punta': 'Punta-Punta',
  'dutch-tool': 'Dutch-Tool',
  'multi-tool': 'Multi-Tool',
  condizionato: 'Condizionato',
  'combo-tool': 'Combo Tool',
  converter: 'Converter',
  casino: 'Casino',
}

export default function CalcolatoriSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params)
  const title = slugToTitle[slug] ?? slug

  if (slug === 'punta-banca') {
    return (
      <>
        <Header />
        <main className="py-12 sm:py-16">
          <Container className="max-w-3xl space-y-8">
            <h1 className="text-center text-3xl font-bold tracking-tight text-foreground">
              Calcolatore Punta - Banca
            </h1>
            <PuntaBancaCalculator />
          </Container>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="py-12 sm:py-16">
        <Container className="max-w-3xl space-y-4 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          <p className="text-muted-foreground">In costruzione.</p>
        </Container>
      </main>
      <Footer />
    </>
  )
}
