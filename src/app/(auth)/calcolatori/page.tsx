'use client'

import * as React from 'react'
import { Suspense } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

import { dsSans, dsSerif } from '@/components/landing/landing-fonts'
import { AdminBadge, CalculatorPanel } from '@/components/calculators/calculator-panel'
import { CalculatorIcon } from '@/components/calculators/calculator-icon'
import { PuntaBancaCalculator } from '@/components/calculators/PuntaBancaCalculator'
import { PuntaPuntaCalculator } from '@/components/calculators/PuntaPuntaCalculator'
import { TriPuntaCalculator } from '@/components/calculators/TriPuntaCalculator'
import { MultiplaOfflineCalculator } from '@/components/calculators/MultiplaOfflineCalculator'
import { BaccaratCalculator } from '@/components/calculators/BaccaratCalculator'
import { RouletteCalculator } from '@/components/calculators/RouletteCalculator'
import { FunBonusCalculator } from '@/components/calculators/FunBonusCalculator'
import { ResultBttsOfflineCalculator } from '@/components/calculators/ResultBttsOfflineCalculator'
import { useAuthStore } from '@/stores/auth-store'
import {
  calculatorGroups,
  openCalculator,
  type CalculatorSlug,
  type CalculatorTool,
} from '@/lib/calculators/catalog'
import { cn } from '@/lib/utils'

const RENDER: Record<CalculatorSlug, () => React.ReactNode> = {
  'punta-banca': () => <PuntaBancaCalculator />,
  'punta-punta': () => <PuntaPuntaCalculator />,
  'tri-punta': () => <TriPuntaCalculator />,
  multipla: () => <MultiplaOfflineCalculator />,
  // §14.220: la versione offline del calcolatore di «Risultato + Goal», solo per gli admin.
  'risultato-goal': () => <ResultBttsOfflineCalculator />,
  baccarat: () => <BaccaratCalculator />,
  roulette: () => <RouletteCalculator />,
  'fun-bonus': () => <FunBonusCalculator />,
}

/**
 * Indice dei calcolatori dal design «OddWise Calcolatori» di Claude Design (§14.267): tessere
 * compatte divise in Sport e Casinò sul tema chiaro ds-*; una tessera apre il calcolatore a
 * schermo intero. Il calcolatore aperto sta in `?expand=<slug>` come prima, così i link delle
 * guide e di /calcolatori/<slug> continuano ad aprirlo.
 */
function CalcolatoriDashboard() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const role = useAuthStore((s) => s.user?.role)
  const groups = calculatorGroups(role)
  // §14.220: le tessere riservate a un ruolo spariscono per gli altri, «expand» compreso.
  const open = openCalculator(searchParams.get('expand'), role)

  const lastOpened = React.useRef<CalculatorSlug | null>(null)
  const tiles = React.useRef(new Map<CalculatorSlug, HTMLButtonElement>())

  const setExpand = React.useCallback(
    (slug: CalculatorSlug | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (slug) params.set('expand', slug)
      else params.delete('expand')
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  // Chiuso il pannello, il fuoco torna sulla tessera che l'aveva aperto.
  const openSlug = open?.slug ?? null
  React.useEffect(() => {
    if (openSlug) {
      lastOpened.current = openSlug
    } else if (lastOpened.current) {
      tiles.current.get(lastOpened.current)?.focus()
      lastOpened.current = null
    }
  }, [openSlug])

  return (
    <div
      className={cn(
        dsSerif.variable,
        dsSans.variable,
        'ds-scope -mx-4 -my-6 flex min-h-[calc(100vh-var(--topnav-h))] flex-col bg-ds-surface font-ds-sans text-base leading-6 tracking-normal text-ds-ink antialiased [color-scheme:light] md:-mx-8',
      )}
    >
      {/* Sotto il pannello aperto l'indice esce dal tab e dai lettori di schermo. */}
      <div
        inert={open ? true : undefined}
        className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-10 px-4 pb-16 pt-10 sm:px-6"
      >
        <h1 className="sr-only">Calcolatori</h1>

        {groups.map((group) => (
          <section key={group.id} className="flex flex-col gap-4">
            <div className="flex items-baseline gap-3 border-b border-ds-line pb-3">
              <h2 className="ds-heading m-0">{group.name}</h2>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
              {group.tools.map((tool) => (
                <CalculatorTile
                  key={tool.slug}
                  tool={tool}
                  onOpen={() => setExpand(tool.slug)}
                  buttonRef={(el) => {
                    if (el) tiles.current.set(tool.slug, el)
                    else tiles.current.delete(tool.slug)
                  }}
                />
              ))}
            </div>
          </section>
        ))}

        <p className="ds-caption mt-auto pt-6 text-ds-ink-muted">
          Gioco vietato ai minori di 18 anni. Gioca responsabilmente.
        </p>
      </div>

      {open && (
        <CalculatorPanel key={open.slug} tool={open} onClose={() => setExpand(null)}>
          {RENDER[open.slug]()}
        </CalculatorPanel>
      )}
    </div>
  )
}

function CalculatorTile({
  tool,
  onOpen,
  buttonRef,
}: {
  tool: CalculatorTool
  onOpen: () => void
  buttonRef: (el: HTMLButtonElement | null) => void
}) {
  const admin = Boolean(tool.requiresRole)
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onOpen}
      aria-label={`Apri ${tool.name}${admin ? ', solo admin' : ''}`}
      className="flex min-h-16 appearance-none items-center gap-3 rounded-ds-md border border-ds-line bg-ds-surface-raised px-4 py-3 text-left text-ds-ink shadow-ds-sm transition-[box-shadow,border-color] duration-150 hover:border-ds-line-strong hover:shadow-ds-md focus-visible:shadow-ds-focus focus-visible:outline-none"
    >
      <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-ds-sm bg-ds-brand-soft text-ds-brand">
        <CalculatorIcon name={tool.icon} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <span className="ds-subheading max-w-full truncate">{tool.name}</span>
        {admin && <AdminBadge />}
      </span>
      <ArrowRight className="h-5 w-5 flex-none text-ds-brand" aria-hidden />
    </button>
  )
}

export default function CalcolatoriPage() {
  return (
    <Suspense fallback={null}>
      <CalcolatoriDashboard />
    </Suspense>
  )
}
