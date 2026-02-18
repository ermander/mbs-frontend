import { Card, CardContent } from '@/components/ui/card'
import { Container } from '@/components/ui/container'

const stats = [
  { value: '10+', label: 'Bookmaker supportati' },
  { value: '500+', label: 'Utenti attivi' },
  { value: '€50k+', label: 'Guadagni totali (community)' },
]

const testimonials = [
  {
    quote:
      'Finalmente uno strumento chiaro per confrontare le quote. In due mesi ho recuperato più del doppio del costo del Premium.',
    name: 'Marco R.',
    role: 'Utente Premium',
  },
  {
    quote:
      'Le guide mi hanno fatto capire il matched betting senza rischiare. Consigliatissimo per chi vuole iniziare.',
    name: 'Laura B.',
    role: 'Utente Free',
  },
  {
    quote: 'Il calcolatore per le surebet è un must. Risparmio tempo e guadagno in precisione.',
    name: 'Andrea G.',
    role: 'Utente Premium',
  },
]

function StatsRow() {
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
      {stats.map(({ value, label }) => (
        <div key={label} className="text-center">
          <div className="text-3xl font-bold text-primary sm:text-4xl">{value}</div>
          <div className="mt-1 text-sm text-muted-foreground">{label}</div>
        </div>
      ))}
    </div>
  )
}

function TestimonialCard({ quote, name, role }: { quote: string; name: string; role?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-muted-foreground">&ldquo;{quote}&rdquo;</p>
        <p className="mt-4 font-medium text-foreground">{name}</p>
        {role && <p className="text-sm text-muted-foreground">{role}</p>}
      </CardContent>
    </Card>
  )
}

export function SocialProofSection() {
  return (
    <section className="py-20 sm:py-28">
      <Container>
        <h2 className="text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Cosa dicono di noi
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
          Numeri e testimonianze dalla community.
        </p>
        <div className="mt-12">
          <StatsRow />
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <TestimonialCard key={t.name} {...t} />
          ))}
        </div>
      </Container>
    </section>
  )
}
