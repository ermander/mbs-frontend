import React from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Container } from '@/components/ui/container'
import { OddsmatcherTable } from '@/components/strumenti/oddsmatcher-table'

const slugToTitle: Record<string, string> = {
  oddsmatcher: 'Oddsmatcher',
  dutcher: 'Dutcher',
  trimatcher: 'Trimatcher',
  himatcher: 'Himatcher',
  targeter: 'Targeter',
}

export default function StrumentiSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params)
  const title = slugToTitle[slug] ?? slug

  if (slug === 'oddsmatcher') {
    return (
      <>
        <Header />
        <main className="min-h-screen py-8">
          <Container className="max-w-[108rem] space-y-6">
            <div className="rounded-md bg-muted px-4 py-3 text-center">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Oddsmatcher</h1>
            </div>
            <OddsmatcherTable />
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
