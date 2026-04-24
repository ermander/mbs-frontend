'use client'

import * as React from 'react'
import { Suspense } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Scale, ArrowLeftRight, Triangle, Layers } from 'lucide-react'

import { CalculatorCard } from '@/components/calculators/calculator-card'
import { PuntaBancaCalculator } from '@/components/calculators/PuntaBancaCalculator'
import { PuntaPuntaCalculator } from '@/components/calculators/PuntaPuntaCalculator'
import { TriPuntaCalculator } from '@/components/calculators/TriPuntaCalculator'
import { MultiplaOfflineCalculator } from '@/components/calculators/MultiplaOfflineCalculator'

type Slug = 'punta-banca' | 'punta-punta' | 'tri-punta' | 'multipla'

const CALCS: Array<{
  slug: Slug
  title: string
  description: string
  icon: typeof Scale
  render: () => React.ReactNode
}> = [
  {
    slug: 'punta-banca',
    title: 'Punta-Banca',
    description:
      'Copri una punta con una banca (lay). Calcola la puntata di copertura e il guadagno minimo.',
    icon: Scale,
    render: () => <PuntaBancaCalculator />,
  },
  {
    slug: 'punta-punta',
    title: 'Punta-Punta',
    description: 'Due punte su esiti opposti. Calcola ripartizione e profitto.',
    icon: ArrowLeftRight,
    render: () => <PuntaPuntaCalculator />,
  },
  {
    slug: 'tri-punta',
    title: 'Tri-Punta',
    description: 'Copertura a tre vie: ripartisci lo stake sui 3 esiti.',
    icon: Triangle,
    render: () => <TriPuntaCalculator />,
  },
  {
    slug: 'multipla',
    title: 'Multipla',
    description: 'Calcolatore per scommesse multiple offline.',
    icon: Layers,
    render: () => <MultiplaOfflineCalculator />,
  },
]

function CalcolatoriDashboard() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const expandedSlug = searchParams.get('expand') as Slug | null

  const handleToggle = React.useCallback(
    (slug: Slug) => {
      const params = new URLSearchParams(searchParams.toString())
      if (expandedSlug === slug) {
        params.delete('expand')
      } else {
        params.set('expand', slug)
      }
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams, expandedSlug],
  )

  return (
    <div className="mx-auto max-w-7xl space-y-6 py-2">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Calcolatori</h1>
        <p className="mt-1 text-muted-foreground">
          Tutti i calcolatori in un unico posto. Espandi una card per vedere tutte le opzioni.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {CALCS.map((calc) => (
          <CalculatorCard
            key={calc.slug}
            title={calc.title}
            description={calc.description}
            icon={calc.icon}
            expanded={expandedSlug === calc.slug}
            onToggle={() => handleToggle(calc.slug)}
          >
            {calc.render()}
          </CalculatorCard>
        ))}
      </div>
    </div>
  )
}

export default function CalcolatoriPage() {
  return (
    <Suspense fallback={null}>
      <CalcolatoriDashboard />
    </Suspense>
  )
}
