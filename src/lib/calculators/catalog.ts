import type { AuthUser } from '@/services/api/auth-client'
import { canUseTool, TOOL_RESULT_BTTS, type ToolKey } from '@/lib/tools'

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
  'scale' | 'arrows' | 'triangle' | 'layers' | 'target' | 'dices' | 'circle-dot' | 'gift'

export interface CalculatorTool {
  slug: CalculatorSlug
  group: CalculatorGroupId
  name: string
  icon: CalculatorIcon
  /**
   * Se presente, la tessera esiste solo per chi ha lo strumento abilitato dal backoffice (gli admin
   * li hanno tutti, §14.122): per gli altri, ospiti compresi, non compare e «expand» non la apre
   * (§14.220, §14.340).
   */
  requiresTool?: ToolKey
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
    requiresTool: TOOL_RESULT_BTTS,
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

/**
 * §14.340: i calcolatori che anche chi non è entrato può usare, dalla landing. Gli altri si aprono
 * lo stesso, ma il pannello mostra l'invito a iscriversi al posto del calcolatore.
 */
export const GUEST_CALCULATORS: ReadonlySet<CalculatorSlug> = new Set<CalculatorSlug>([
  'punta-banca',
  'punta-punta',
  'tri-punta',
  'multipla',
  'baccarat',
  'roulette',
])

/** Chi guarda la pagina: l'utente entrato (ruolo e strumenti) oppure null per un ospite. */
export type CalculatorViewer = Pick<AuthUser, 'role' | 'tools'> | null | undefined

/**
 * Cosa vede chi guarda di un calcolatore: `open` lo usa, `members` vede la tessera ma il pannello
 * lo invita a iscriversi (solo gli ospiti), `hidden` non lo vede affatto.
 */
export type CalculatorAccess = 'open' | 'members' | 'hidden'

export function calculatorAccess(tool: CalculatorTool, viewer: CalculatorViewer): CalculatorAccess {
  if (tool.requiresTool && !canUseTool(viewer, tool.requiresTool)) return 'hidden'
  if (!viewer && !GUEST_CALCULATORS.has(tool.slug)) return 'members'
  return 'open'
}

/** Le tessere che chi guarda vede, divise nei gruppi del design; un gruppo vuoto non compare. */
export function calculatorGroups(viewer: CalculatorViewer) {
  const visible = CALCULATOR_TOOLS.filter((tool) => calculatorAccess(tool, viewer) !== 'hidden')
  return CALCULATOR_GROUPS.map((group) => ({
    ...group,
    tools: visible.filter((tool) => tool.group === group.id),
  })).filter((group) => group.tools.length > 0)
}

/**
 * Il calcolatore da aprire per `?expand=`: null se lo slug non esiste o chi guarda non lo vede.
 * Un calcolatore solo per iscritti si apre anche a un ospite: il pannello decide cosa mostrare con
 * `calculatorAccess`.
 */
export function openCalculator(
  expand: string | null | undefined,
  viewer: CalculatorViewer,
): CalculatorTool | null {
  const tool = CALCULATOR_TOOLS.find((t) => t.slug === expand)
  if (!tool) return null
  if (calculatorAccess(tool, viewer) === 'hidden') return null
  return tool
}
