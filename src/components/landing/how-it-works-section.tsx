import { LucideIcon } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { LandingSection } from '@/components/landing/landing-section'
import { cn } from '@/lib/utils'

import { UserPlus, Search, Calculator, TrendingUp } from 'lucide-react'

const steps: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: UserPlus,
    title: 'Registrati',
    description: 'Crea un account gratuito in pochi secondi. Nessuna carta richiesta per iniziare.',
  },
  {
    icon: Search,
    title: 'Trova le quote',
    description:
      "Usa il comparatore per vedere le quote di diversi bookmaker in un colpo d'occhio.",
  },
  {
    icon: Calculator,
    title: 'Calcola e scommetti',
    description: 'I nostri calcolatori ti aiutano a gestire matched betting, surebet e value bet.',
  },
  {
    icon: TrendingUp,
    title: 'Guadagna',
    description: 'Segui le guide e gli strumenti per massimizzare i guadagni in modo sicuro.',
  },
]

function StepCard({
  step,
  index,
  className,
}: {
  step: (typeof steps)[number]
  index: number
  className?: string
}) {
  const Icon = step.icon
  return (
    <Card
      className={cn(
        'h-full transition-all duration-200 hover:border-primary/20 hover:shadow-glow-sm',
        className,
      )}
    >
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <span className="text-sm font-medium text-muted-foreground">Step {index + 1}</span>
            <h3 className="mt-1 font-semibold text-foreground">{step.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function HowItWorksSection() {
  return (
    <LandingSection id="come-funziona" className="scroll-mt-20" accent="blue-wash" hairlineTop>
      <Container>
        <h2 className="text-center text-3xl font-bold tracking-[-0.03em] text-foreground sm:text-4xl">
          Come funziona
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
          Tre passi semplici per iniziare a usare gli strumenti e le strategie.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <StepCard key={step.title} step={step} index={index} />
          ))}
        </div>
      </Container>
    </LandingSection>
  )
}
