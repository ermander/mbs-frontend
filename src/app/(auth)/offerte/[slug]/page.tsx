import React from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Container } from '@/components/ui/container'

const slugToTitle: Record<string, string> = {
  'bonus-benvenuto': 'Bonus di benvenuto',
  promozioni: 'Promozioni ricorrenti',
  'guadagni-extra': 'Guadagni extra',
  telegram: 'Canale Telegram',
}

export default function OfferteSlugPage({ params }: { params: Promise<{ slug: string }> }) {
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
