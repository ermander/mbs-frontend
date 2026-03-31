import { LucideIcon } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { LandingSection } from '@/components/landing/landing-section'
import { cn } from '@/lib/utils'

import { BarChart3, Calculator, BookOpen, TrendingUp, Target, Sparkles } from 'lucide-react'

const features: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: BarChart3,
    title: 'Comparatore quote',
    description:
      'Confronta le quote di diversi bookmaker per lo stesso evento e trova le migliori opportunità.',
  },
  {
    icon: Calculator,
    title: 'Calcolatori',
    description:
      'Calcolatori per matched betting, surebet e offerte di benvenuto. Tutti i calcoli al posto giusto.',
  },
  {
    icon: TrendingUp,
    title: 'Value bet e Sure bet',
    description:
      'Strumenti per individuare value bet e sure bet e massimizzare il profitto con meno rischio.',
  },
  {
    icon: Target,
    title: 'Bet tracker',
    description: 'Tieni traccia delle tue scommesse e dei guadagni in un unico posto.',
  },
  {
    icon: BookOpen,
    title: 'Guide e tutorial',
    description: 'Guide step-by-step per imparare il matched betting e le strategie correlate.',
  },
  {
    icon: Sparkles,
    title: 'Altro in arrivo',
    description: 'Nuove funzionalità in sviluppo per rendere la tua esperienza ancora migliore.',
  },
]

function FeatureCard({
  feature,
  className,
}: {
  feature: (typeof features)[number]
  className?: string
}) {
  const Icon = feature.icon
  return (
    <Card
      className={cn(
        'h-full transition-all duration-200 hover:border-primary/20 hover:shadow-glow-sm',
        className,
      )}
    >
      <CardContent className="pt-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="mt-4 font-semibold text-foreground">{feature.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
      </CardContent>
    </Card>
  )
}

export function FeaturesSection() {
  return (
    <LandingSection id="strumenti" className="scroll-mt-20" accent="cyan-wash" hairlineTop>
      <Container>
        <h2 className="text-center text-3xl font-bold tracking-[-0.03em] text-foreground sm:text-4xl">
          Strumenti e funzionalità
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
          Tutto ciò che ti serve per confrontare quote, calcolare le scommesse e guadagnare in modo
          consapevole.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </Container>
    </LandingSection>
  )
}
