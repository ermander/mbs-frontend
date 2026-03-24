import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { cn } from '@/lib/utils'

import { Check } from 'lucide-react'

const plans = [
  {
    name: 'Free',
    price: '0',
    period: '/mese',
    description: 'Per provare gli strumenti base',
    features: [
      'Accesso al comparatore quote (2 bookmaker)',
      'Guide introduttive',
      'Calcolatore base',
      'Supporto community',
    ],
    cta: 'Inizia gratis',
    href: '/registrazione',
    highlighted: false,
  },
  {
    name: 'Premium',
    price: '19',
    period: '/mese',
    description: 'Per massimizzare i guadagni',
    features: [
      'Tutti i bookmaker supportati',
      'Calcolatori avanzati (matched, surebet, value)',
      'Bet tracker',
      'Alert e segnalazioni',
      'Supporto prioritario',
    ],
    cta: 'Passa a Premium',
    href: '/registrazione?plan=premium',
    highlighted: true,
  },
]

function PricingCard({
  name,
  price,
  period,
  description,
  features,
  cta,
  href,
  highlighted,
}: (typeof plans)[number]) {
  return (
    <Card
      className={cn(
        'flex flex-col',
        highlighted && 'border-primary/30 shadow-glow-sm ring-1 ring-primary/30',
      )}
      variant={highlighted ? 'elevated' : 'default'}
    >
      <CardHeader className="text-center">
        {highlighted && (
          <span className="mb-2 inline-block rounded-full bg-primary/20 px-3 py-0.5 text-xs font-medium text-primary">
            Consigliato
          </span>
        )}
        <h3 className="text-xl font-semibold text-foreground">{name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <div className="mt-4 flex items-baseline justify-center gap-1">
          <span className="font-mono text-4xl font-bold text-foreground">€{price}</span>
          <span className="text-muted-foreground">{period}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        <ul className="space-y-3">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-3 text-sm text-muted-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="pt-6">
        <Button className="w-full" variant={highlighted ? 'default' : 'outline'} asChild>
          <Link href={href}>{cta}</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

export function PricingSection() {
  return (
    <section id="prezzi" className="scroll-mt-20 py-20 sm:py-28">
      <Container>
        <h2 className="text-center text-3xl font-bold tracking-[-0.03em] text-foreground sm:text-4xl">
          Piani e prezzi
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
          Inizia gratis e passa a Premium quando vuoi per sbloccare tutti gli strumenti.
        </p>
        <div className="mt-12 grid gap-8 lg:mx-auto lg:max-w-4xl lg:grid-cols-2">
          {plans.map((plan) => (
            <PricingCard key={plan.name} {...plan} />
          ))}
        </div>
      </Container>
    </section>
  )
}
