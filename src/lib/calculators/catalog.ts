import type { UserRole } from '@/services/api/auth-client'

/**
 * Catalogo dei calcolatori della pagina /calcolatori (design «OddWise Calcolatori» di Claude
 * Design, §14.267): gruppi, nomi e icone delle tessere, nell'ordine del design. Lo slug è quello
 * dell'URL (`?expand=<slug>`, `/calcolatori/<slug>`): le guide delle offerte e i vecchi link
 * puntano lì, quindi non si rinomina.
 */

export type CalculatorSlug =
  | 'punta-banca'
  | 'punta-punta'
  | 'tri-punta'
  | 'multipla'
  | 'risultato-goal'
  | 'baccarat'
  | 'roulette'
  | 'fun-bonus'

export type CalculatorGroupId = 'sport' | 'casino'

export type CalculatorIcon =
  | 'scale'
  | 'arrows'
  | 'triangle'
  | 'layers'
  | 'target'
  | 'dices'
  | 'circle-dot'
  | 'gift'

export interface CalculatorTool {
  slug: CalculatorSlug
  group: CalculatorGroupId
  name: string
  icon: CalculatorIcon
  /** Se presente, la tessera è visibile solo a chi ha quel ruolo (§14.220), «expand» compreso. */
  requiresRole?: UserRole
}

export const CALCULATOR_GROUPS: ReadonlyArray<{ id: CalculatorGroupId; name: string }> = [
  { id: 'sport', name: 'Sport' },
  { id: 'casino', name: 'Casinò' },
]

export const CALCULATOR_TOOLS: ReadonlyArray<CalculatorTool> = [
  { slug: 'punta-banca', group: 'sport', name: 'Punta-Banca', icon: 'scale' },
  { slug: 'punta-punta', group: 'sport', name: 'Punta-Punta', icon: 'arrows' },
  { slug: 'tri-punta', group: 'sport', name: 'Tri-Punta', icon: 'triangle' },
  { slug: 'multipla', group: 'sport', name: 'Multipla', icon: 'layers' },
  {
    slug: 'risultato-goal',
    group: 'sport',
    name: 'Risultato + Goal',
    icon: 'target',
    requiresRole: 'ADMIN_ROLE',
  },
  { slug: 'baccarat', group: 'casino', name: 'Baccarat', icon: 'dices' },
  { slug: 'roulette', group: 'casino', name: 'Roulette europea', icon: 'circle-dot' },
  { slug: 'fun-bonus', group: 'casino', name: 'Target fun bonus', icon: 'gift' },
]

/** I calcolatori senza giocata da salvare: il guscio non mostra «Salva nel tracker». */
export const CALCULATORS_WITHOUT_SAVE: ReadonlySet<CalculatorSlug> = new Set(['fun-bonus'])

export function isCalculatorSlug(value: string | null | undefined): value is CalculatorSlug {
  return CALCULATOR_TOOLS.some((tool) => tool.slug === value)
}

/** Le tessere che il ruolo vede, divise nei gruppi del design; un gruppo vuoto non compare. */
export function calculatorGroups(role: UserRole | undefined) {
  const visible = CALCULATOR_TOOLS.filter(
    (tool) => !tool.requiresRole || tool.requiresRole === role,
  )
  return CALCULATOR_GROUPS.map((group) => ({
    ...group,
    tools: visible.filter((tool) => tool.group === group.id),
  })).filter((group) => group.tools.length > 0)
}

/** Il calcolatore da aprire per `?expand=`: null se lo slug non esiste o il ruolo non lo vede. */
export function openCalculator(
  expand: string | null | undefined,
  role: UserRole | undefined,
): CalculatorTool | null {
  const tool = CALCULATOR_TOOLS.find((t) => t.slug === expand)
  if (!tool) return null
  if (tool.requiresRole && tool.requiresRole !== role) return null
  return tool
}
