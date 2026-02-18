import React from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Container } from '@/components/ui/container'

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
