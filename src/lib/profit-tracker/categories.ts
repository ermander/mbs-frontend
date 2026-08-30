import type { BetCategory, QuickGameMethod } from '@/types/profit-tracker'

/**
 * Sorgente unica per i metodi delle Giocate Rapide (input "Metodo")
 * e per le categorie di profitto mostrate nella sezione Report.
 */

export const QUICK_METHODS: { value: QuickGameMethod; label: string }[] = [
  { value: 'baccarat', label: 'Baccarat' },
  { value: 'bingo', label: 'Bingo' },
  { value: 'blackjack', label: 'Blackjack' },
  { value: 'casino_live', label: 'Casino Live' },
  { value: 'gratta_e_vinci', label: 'Gratta e Vinci' },
  { value: 'quick_games', label: 'Quick Games' },
  { value: 'roulette', label: 'Roulette' },
  { value: 'slot_machine', label: 'Slot Machine' },
  { value: 'sport', label: 'Sport' },
  { value: 'trading', label: 'Trading' },
  { value: 'altro', label: 'Altro' },
]

export const BET_CATEGORIES: { value: BetCategory; label: string }[] = [
  { value: 'matched_betting', label: 'Matched Betting' },
  { value: 'surebet', label: 'Surebet' },
  { value: 'valuebet', label: 'Valuebet' },
]

/** Tutte le categorie di profitto (giocate + giocate rapide), per filtri e legende del Report. */
export const PROFIT_CATEGORIES: { value: string; label: string }[] = [
  ...BET_CATEGORIES,
  ...QUICK_METHODS,
]

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  PROFIT_CATEGORIES.map((c) => [c.value, c.label]),
)

export function getCategoryLabel(categoria: string): string {
  return CATEGORY_LABELS[categoria] ?? categoria
}
