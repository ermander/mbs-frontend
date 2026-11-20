'use client'

import * as React from 'react'
import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

import { dsSans, dsSerif } from '@/components/landing/landing-fonts'
import { CalculatorBadge, CalculatorPanel } from '@/components/calculators/calculator-panel'
import { MembersOnlyNotice } from '@/components/calculators/members-only-notice'
import { CalculatorIcon } from '@/components/calculators/calculator-icon'
import { PuntaBancaCalculator } from '@/components/calculators/PuntaBancaCalculator'
import { PuntaPuntaCalculator } from '@/components/calculators/PuntaPuntaCalculator'
import { TriPuntaCalculator } from '@/components/calculators/TriPuntaCalculator'
import { MultiplaOfflineCalculator } from '@/components/calculators/MultiplaOfflineCalculator'
import { CondizionatoCalculator } from '@/components/calculators/CondizionatoCalculator'
import { BaccaratCalculator } from '@/components/calculators/BaccaratCalculator'
import { RouletteCalculator } from '@/components/calculators/RouletteCalculator'
import { FunBonusCalculator } from '@/components/calculators/FunBonusCalculator'
import { useAuthStore } from '@/stores/auth-store'
import {
  calculatorAccess,
  calculatorGroups,
  openCalculator,
  type CalculatorAccess,
  type CalculatorSlug,
  type CalculatorTool,
} from '@/lib/calculators/catalog'
import { cn } from '@/lib/utils'

/**
 * §14.340: Risultato + Goal in un pezzo di codice a parte, che il browser scarica solo quando lo
 * apre chi ce l'ha abilitato; un ospite o un utente senza lo strumento non lo ricevono mai.
 */
const ResultBttsOfflineCalculator = dynamic(
  () =>
    import('@/components/calculators/ResultBttsOfflineCalculator').then(
      (m) => m.ResultBttsOfflineCalculator,
    ),
  { ssr: false },
)

const RENDER: Record<CalculatorSlug, () => React.ReactNode> = {
  'punta-banca': () => <PuntaBancaCalculator />,
  'punta-punta': () => <PuntaPuntaCalculator />,
  'tri-punta': () => <TriPuntaCalculator />,
  multipla: () => <MultiplaOfflineCalculator />,
  // §14.349: rimborso condizionato, aperto anche agli ospiti.
  condizionato: () => <CondizionatoCalculator />,
  // §14.220: la versione offline del calcolatore di «Risultato + Goal», solo per chi ha lo
  // strumento abilitato dal backoffice (§14.340).
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
 *
 * §14.340: la pagina è aperta anche a chi non è entrato (gruppo di rotte `(open)`, OpenAreaLayout), che ci arriva
 * dalla landing. Un ospite usa i calcolatori di GUEST_CALCULATORS senza salvataggio; gli altri si
 * aprono con l'invito a iscriversi. Risultato + Goal non esiste per chi non ce l'ha abilitato.
 */
function CalcolatoriDashboard() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const user = useAuthStore((s) => s.user)
  const guest = !user
  const groups = calculatorGroups(user)
  const expand = searchParams.get('expand')
  // §14.220: le tessere riservate spariscono per chi non le ha, «expand» compreso.
  const open = openCalculator(expand, user)
  const openAccess = open ? calculatorAccess(open, user) : null

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

  // Uno slug che chi guarda non può aprire (sconosciuto, o Risultato + Goal senza lo strumento)
  // esce dall'URL: la pagina non lascia traccia di ciò che non mostra. Il layout rende la pagina
  // solo quando sa chi guarda, quindi `user` qui è già quello vero.
  React.useEffect(() => {
    if (expand !== null && !open) setExpand(null)
  }, [expand, open, setExpand])

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
        'ds-scope -mx-4 -my-6 flex min-h-[calc(100vh-var(--topnav-h))] flex-col bg-ds-surface font-ds-sans text-base leading-6 tracking-normal text-ds-ink antialiased scheme-light md:-mx-8',
      )}
    >
      {/* Sotto il pannello aperto l'indice esce dal tab e dai lettori di schermo. */}
      <div
        inert={open ? true : undefined}
        className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-10 px-4 pt-10 pb-16 sm:px-6"
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
                  access={calculatorAccess(tool, user)}
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
        <CalculatorPanel
          key={open.slug}
          tool={open}
          guest={guest}
          locked={openAccess !== 'open'}
          onClose={() => setExpand(null)}
        >
          {openAccess === 'open' ? RENDER[open.slug]() : <MembersOnlyNotice tool={open} />}
        </CalculatorPanel>
      )}
    </div>
  )
}

function CalculatorTile({
  tool,
  access,
  onOpen,
  buttonRef,
}: {
  tool: CalculatorTool
  access: CalculatorAccess
  onOpen: () => void
  buttonRef: (el: HTMLButtonElement | null) => void
}) {
  const reserved = Boolean(tool.requiresTool)
  const members = access === 'members'
  const note = reserved ? ', riservato' : members ? ', solo per utenti iscritti' : ''
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onOpen}
      aria-label={`Apri ${tool.name}${note}`}
      className="flex min-h-16 appearance-none items-center gap-3 rounded-ds-md border border-ds-line bg-ds-surface-raised px-4 py-3 text-left text-ds-ink shadow-ds-sm transition-[box-shadow,border-color] duration-150 hover:border-ds-line-strong hover:shadow-ds-md focus-visible:shadow-ds-focus focus-visible:outline-hidden"
    >
      <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-ds-sm bg-ds-brand-soft text-ds-brand">
        <CalculatorIcon name={tool.icon} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <span className="ds-subheading max-w-full truncate">{tool.name}</span>
        {reserved && <CalculatorBadge kind="reserved" />}
        {members && <CalculatorBadge kind="members" />}
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
