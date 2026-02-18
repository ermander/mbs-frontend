import { Card, CardContent } from '@/components/ui/card'
import { Container } from '@/components/ui/container'

import { Scale, Shield, Calculator } from 'lucide-react'

const points = [
  {
    icon: Shield,
    label: 'Legale',
    description: 'Il matched betting è una tecnica matematica legale, non è scommessa al buio.',
  },
  {
    icon: Calculator,
    label: 'Strumenti',
    description: 'Calcolatori e comparatori per ridurre il rischio e massimizzare i guadagni.',
  },
  {
    icon: Scale,
    label: 'Trasparenza',
    description: 'Tutto in chiaro: quote, calcoli e guide step-by-step per operare in sicurezza.',
  },
]

export function ValuePropositionSection() {
  return (
    <section className="py-20 sm:py-28">
      <Container>
        <Card variant="elevated" className="mx-auto max-w-4xl">
          <CardContent className="pt-6">
            <p className="text-center text-lg text-muted-foreground">
              Il <strong className="text-foreground">matched betting</strong>, le{' '}
              <strong className="text-foreground">surebet</strong> e le{' '}
              <strong className="text-foreground">value bet</strong> sono strategie basate su
              calcolo e confronto quote: sfruttano bonus e differenze tra bookmaker per generare
              profitto con rischio contenuto. Non è gioco d’azzardo: è uso consapevole degli
              strumenti.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {points.map(({ icon: Icon, label, description }) => (
                <div key={label} className="flex flex-col items-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-3 font-semibold text-foreground">{label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </Container>
    </section>
  )
}
