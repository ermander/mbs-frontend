import type { MatchType, MatcherMeta } from '@/types/matcher'

/**
 * The three pages of the scanner (ADAPTER_STATUS §14.406, ClickUp «Separare Oddsmatcher, Dutcher e
 * Trimatcher»). Until then one table showed every kind of combination with a «Tipo» filter; now
 * each kind has its page in the «Radar» menu, with the filters of its own rows:
 * - Oddsmatcher: punta sul book, banca sull'exchange (`back_lay`), 2 or 3 outcomes;
 * - Dutcher: punta-punta on the two outcomes of a market (`dutch_2way`);
 * - Trimatcher: punta-punta on the three outcomes of a market (`dutch_3way`).
 * A dutch leg may sit on an exchange as a back at the net price, as before (the «Exchange»
 * filter of the panel restricts it).
 */
export type MatcherPageKey = 'oddsmatcher' | 'dutcher' | 'trimatcher'

export interface MatcherPage {
  key: MatcherPageKey
  /** The kind of row of the page: the `match_type` of every request of the page. */
  matchType: MatchType
  href: string
  title: string
  description: string
  /** Header of the column with the legs after «Puntata». */
  coverColumn: string
  /** Caption of the table, read by screen readers. */
  caption: string
  /**
   * Whether the page offers the Multipla: the 3-way rows never enter one
   * (`matcherRowToMultiplaEvent`), so the Trimatcher has no button.
   */
  multipla: boolean
  /**
   * On the Oddsmatcher the other leg is always the exchange's lay: the bar offers «Exchange»
   * where the other pages offer «Bookmaker di copertura».
   */
  coverIsExchange: boolean
}

export const MATCHER_PAGES: Readonly<Record<MatcherPageKey, MatcherPage>> = {
  oddsmatcher: {
    key: 'oddsmatcher',
    matchType: 'back_lay',
    href: '/odds-scanner',
    title: 'Oddsmatcher',
    description:
      "Punta sul bookmaker e banca sull'exchange: le combinazioni con il rating più alto.",
    coverColumn: 'Bancata',
    caption: 'Combinazioni puntata e bancata',
    multipla: true,
    coverIsExchange: true,
  },
  dutcher: {
    key: 'dutcher',
    matchType: 'dutch_2way',
    href: '/dutcher',
    title: 'Dutcher',
    description:
      'Punta su due bookmaker i due esiti di un mercato (Over/Under, Goal/No Goal…): le coppie con il rating più alto.',
    coverColumn: 'Copertura',
    caption: 'Combinazioni punta-punta a due esiti',
    multipla: true,
    coverIsExchange: false,
  },
  trimatcher: {
    key: 'trimatcher',
    matchType: 'dutch_3way',
    href: '/trimatcher',
    title: 'Trimatcher',
    description:
      'Punta su tre bookmaker i tre esiti di un mercato (1X2…): le combinazioni con il rating più alto.',
    coverColumn: 'Coperture',
    caption: 'Combinazioni punta-punta a tre esiti',
    multipla: false,
    coverIsExchange: false,
  },
}

/**
 * The meta of one page: competitions with their rows of the page's kind (the others left out),
 * the sports and nations those competitions are in, the market types of that kind and its total.
 * The backend sends the split since §14.406 (`byMatchType`, `resultsByType`); a meta without it
 * (older backend, free meta) is returned as it is, with the lists of every kind.
 */
export function scopedMeta(meta: MatcherMeta, matchType: MatchType): MatcherMeta {
  const byType = meta.byMatchType?.[matchType]
  const competitions = meta.competitions
  const perCompetition =
    competitions !== undefined &&
    competitions.length > 0 &&
    competitions.every((c) => c.resultsByType !== undefined)
  if (!byType && !perCompetition) return meta

  const scoped: MatcherMeta = { ...meta }
  if (byType) {
    scoped.totalResults = byType.totalResults
    const ofType = new Set(byType.marketTypes)
    // The order of the full list, then anything only the split knows.
    scoped.marketTypes = [
      ...meta.marketTypes.filter((m) => ofType.has(m)),
      ...byType.marketTypes.filter((m) => !meta.marketTypes.includes(m)),
    ]
  }
  if (perCompetition) {
    const inScope = competitions.flatMap((c) => {
      const results = c.resultsByType?.[matchType] ?? 0
      return results > 0 ? [{ ...c, results }] : []
    })
    scoped.competitions = inScope
    scoped.sports = meta.sports.filter((s) => inScope.some((c) => c.sportName === s))
    scoped.nations = meta.nations.filter((n) => inScope.some((c) => c.nationName === n))
  }
  return scoped
}
