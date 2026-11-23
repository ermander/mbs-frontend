import { getItalianCountryName } from '@/lib/country-flags'
import type {
  BestOddsBookmaker,
  BestOddsCatalog,
  BestOddsCompetition,
  BestOddsEventSummary,
  BestOddsMarket,
  BestOddsMarketRow,
  BestOddsNation,
  BestOddsOutcome,
  BestOddsSport,
} from '@/types/best-odds'

/**
 * «Best Odds» (ADAPTER_STATUS §14.390): names, the tree of an event's markets, the ranking of the
 * sites on one outcome and the address of the page. Pure: the components only draw what comes
 * out of here.
 */

export const BEST_ODDS_PATH = '/best-odds'
/** Events per page of a list, the default of the backend. */
export const BEST_ODDS_PAGE_SIZE = 50

/* ---------- Names ---------- */

const MARKET_NAMES: Record<string, string> = {
  '1x2': '1X2',
  double_chance: 'Doppia chance',
  draw_no_bet: 'Draw no bet',
  btts: 'Goal/No Goal',
  over_under: 'Under/Over',
  result_btts: '1X2 + Goal/No Goal',
  handicap_european: 'Handicap europeo',
  handicap_asian: 'Handicap asiatico',
  odd_even: 'Pari/Dispari',
  halftime_fulltime: 'Parziale/Finale',
  correct_score: 'Risultato esatto',
  corner_1x2: 'Corner 1X2',
  corner_over_under: 'Corner Under/Over',
}

/** «Under/Over», «Goal/No Goal»; a type the page does not know yet keeps its key, readable. */
export function marketTypeName(key: string): string {
  const known = MARKET_NAMES[key]
  if (known) return known
  const words = key.replace(/_/g, ' ').trim()
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : key
}

const PERIOD_NAMES: Record<string, string> = {
  full_time: 'Finale',
  first_half: '1° tempo',
  second_half: '2° tempo',
  extra_time: 'Supplementari',
}

/** The period of a market; a market without one (Parziale/Finale) reads as the whole match. */
export function periodName(period: string | null | undefined): string {
  if (!period) return PERIOD_NAMES.full_time
  return PERIOD_NAMES[period] ?? period.replace(/_/g, ' ')
}

interface TeamNames {
  homeName?: string | null
  awayName?: string | null
}

function teamName(scope: string, names?: TeamNames): string {
  if (scope === 'home') return names?.homeName || 'Casa'
  if (scope === 'away') return names?.awayName || 'Ospite'
  return scope
}

/** «1° tempo», «Finale · Genoa»: the period of a market and, for a team market, whose it is. */
export function variantLabel(
  variant: Pick<BestOddsMarket, 'periodScope' | 'teamScope'>,
  names?: TeamNames,
): string {
  const period = periodName(variant.periodScope)
  return variant.teamScope ? `${period} · ${teamName(variant.teamScope, names)}` : period
}

function plainNumber(value: number): string {
  return String(Number(value.toFixed(2)))
}

/** The line of an Under/Over («2.5») or the handicap («+1», «−0.5», «0»); null when the market has neither. */
export function marketLineLabel(market: Pick<BestOddsMarket, 'line' | 'handicap'>): string | null {
  if (market.line != null) return plainNumber(market.line)
  if (market.handicap != null) {
    if (market.handicap > 0) return `+${plainNumber(market.handicap)}`
    if (market.handicap < 0) return `−${plainNumber(Math.abs(market.handicap))}`
    return '0'
  }
  return null
}

/** «Under/Over 2.5», «1X2 · 1° tempo», «Handicap europeo −1»: one market, said in full. */
export function marketFullLabel(
  market: Pick<BestOddsMarket, 'marketTypeKey' | 'line' | 'handicap' | 'periodScope' | 'teamScope'>,
  names?: TeamNames,
): string {
  const line = marketLineLabel(market)
  let label = marketTypeName(market.marketTypeKey)
  if (line) label += ` ${line}`
  const wholeMatch = !market.periodScope || market.periodScope === 'full_time'
  if (!wholeMatch || market.teamScope) label += ` · ${variantLabel(market, names)}`
  return label
}

const OUTCOME_NAMES: Record<string, string> = {
  odd: 'Dispari',
  even: 'Pari',
  other: 'Altro',
}

/** The outcome as the page shows it: the label of the backend, in Italian where it is English. */
export function outcomeName(outcome: BestOddsOutcome): string {
  return OUTCOME_NAMES[outcome.key] ?? outcome.label
}

/** The markets whose «1» and «2» are the two teams. */
const TEAM_OUTCOME_MARKETS = new Set([
  '1x2',
  'draw_no_bet',
  'handicap_european',
  'handicap_asian',
  'corner_1x2',
])

/** What «1», «X» and «2» stand for on this event: the team, or the draw. Null for the other outcomes. */
export function outcomeHint(
  marketTypeKey: string,
  outcomeKey: string,
  names: TeamNames,
): string | null {
  if (!TEAM_OUTCOME_MARKETS.has(marketTypeKey)) return null
  if (outcomeKey === 'home') return names.homeName || null
  if (outcomeKey === 'away') return names.awayName || null
  if (outcomeKey === 'draw') return 'Pareggio'
  return null
}

/** «Genoa – Como»; a side the catalog does not name is a question mark, as in the Oddsmatcher. */
export function eventTitle(event: Pick<BestOddsEventSummary, 'homeName' | 'awayName'>): string {
  return `${event.homeName ?? '?'} – ${event.awayName ?? '?'}`
}

/* ---------- Catalog ---------- */

/** The four home nations: their codes are no ISO region, so the browser has no Italian name for them. */
const HOME_NATIONS: Record<string, string> = {
  'GB-ENG': 'Inghilterra',
  'GB-SCT': 'Scozia',
  'GB-WLS': 'Galles',
  'GB-NIR': 'Irlanda del Nord',
}

function isWorld(name: string | null | undefined): boolean {
  return (name ?? '').trim().toLowerCase() === 'world'
}

/**
 * The nation in Italian: from its code where it is a country («IT» → «Italia»), by hand for the
 * home nations, «Internazionale» for the bucket of the international cups («World»); else the
 * name of the catalog, without its hyphens.
 */
export function nationLabel(name: string | null | undefined, code: string | null | undefined) {
  const c = (code ?? '').trim().toUpperCase()
  if (HOME_NATIONS[c]) return HOME_NATIONS[c]
  if (/^[A-Z]{2}$/.test(c)) {
    const italian = getItalianCountryName(c)
    if (italian) return italian
  }
  if (!name || !name.trim()) return 'Altre competizioni'
  if (isWorld(name)) return 'Internazionale'
  return name.replace(/-/g, ' ').trim()
}

/** Stable identity of a nation inside its sport. */
export function nationKey(nation: Pick<BestOddsNation, 'name' | 'code'>): string {
  return `${nation.code ?? ''}|${nation.name ?? ''}`
}

const collator = new Intl.Collator('it', { sensitivity: 'base', numeric: true })

/** Italy first, then the international cups, then the others by their Italian name. */
export function sortedNations(nations: readonly BestOddsNation[]): BestOddsNation[] {
  const weight = (n: BestOddsNation) =>
    (n.code ?? '').toUpperCase() === 'IT' ? 0 : isWorld(n.name) ? 1 : 2
  return [...nations].sort(
    (a, b) =>
      weight(a) - weight(b) ||
      collator.compare(nationLabel(a.name, a.code), nationLabel(b.name, b.code)),
  )
}

export interface CatalogPlace {
  sport: BestOddsSport
  nation: BestOddsNation
  competition: BestOddsCompetition
}

/** Where a competition sits in the catalog; null when it has no event to show any more. */
export function findCompetition(
  catalog: BestOddsCatalog | null | undefined,
  competitionId: string | null | undefined,
): CatalogPlace | null {
  if (!catalog || !competitionId) return null
  for (const sport of catalog.sports) {
    for (const nation of sport.nations) {
      const competition = nation.competitions.find((c) => c.id === competitionId)
      if (competition) return { sport, nation, competition }
    }
  }
  return null
}

/* ---------- Days of a list of events ---------- */

function dayKey(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

/** «Oggi», «Domani», then «mercoledì 25 novembre». */
export function dayLabel(iso: string, nowMs: number, timeZone?: string): string {
  const key = dayKey(iso, timeZone)
  if (key === dayKey(new Date(nowMs).toISOString(), timeZone)) return 'Oggi'
  if (key === dayKey(new Date(nowMs + 86_400_000).toISOString(), timeZone)) return 'Domani'
  return new Intl.DateTimeFormat('it-IT', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(iso))
}

export interface EventDay<E> {
  key: string
  label: string
  events: E[]
}

/** The events of a list under the day they are played, in the order they came (by kickoff). */
export function groupEventsByDay<E extends { startTime: string }>(
  events: readonly E[],
  nowMs: number,
  timeZone?: string,
): EventDay<E>[] {
  const days: EventDay<E>[] = []
  for (const event of events) {
    const key = dayKey(event.startTime, timeZone)
    const last = days[days.length - 1]
    if (last && last.key === key) last.events.push(event)
    else days.push({ key, label: dayLabel(event.startTime, nowMs, timeZone), events: [event] })
  }
  return days
}

/* ---------- The markets of an event ---------- */

/** The markets of one type on one period (and team): they differ only by line or handicap. */
export interface BestOddsVariant {
  key: string
  periodScope: string | null
  teamScope: string | null
  markets: BestOddsMarket[]
}

/** One market type of the event: «Under/Over» with its periods, each with its lines. */
export interface BestOddsMarketGroup {
  /** The market type key. */
  key: string
  name: string
  /** How many sites price at least one market of the type. */
  sites: number
  variants: BestOddsVariant[]
}

/** Type → period → line, in the order the backend lists the markets. */
export function groupMarkets(markets: readonly BestOddsMarket[]): BestOddsMarketGroup[] {
  const groups = new Map<string, BestOddsMarketGroup & { slugs: Set<string> }>()
  for (const market of markets) {
    let group = groups.get(market.marketTypeKey)
    if (!group) {
      group = {
        key: market.marketTypeKey,
        name: marketTypeName(market.marketTypeKey),
        sites: 0,
        variants: [],
        slugs: new Set(),
      }
      groups.set(market.marketTypeKey, group)
    }
    const variantKey = `${market.periodScope ?? ''}|${market.teamScope ?? ''}`
    let variant = group.variants.find((v) => v.key === variantKey)
    if (!variant) {
      variant = {
        key: variantKey,
        periodScope: market.periodScope,
        teamScope: market.teamScope,
        markets: [],
      }
      group.variants.push(variant)
    }
    variant.markets.push(market)
    for (const row of market.rows) group.slugs.add(row.bookmaker)
  }
  return [...groups.values()].map(({ slugs, ...group }) => ({ ...group, sites: slugs.size }))
}

/**
 * The market a variant opens on: the one most sites price; among equals the 2.5 of an Under/Over,
 * the handicap nearest to zero, else the one in the middle.
 */
export function defaultMarket(markets: readonly BestOddsMarket[]): BestOddsMarket | null {
  if (markets.length === 0) return null
  const middle = (markets.length - 1) / 2
  const distance = (market: BestOddsMarket, index: number) => {
    if (market.marketTypeKey === 'over_under' && market.line != null) {
      return Math.abs(market.line - 2.5)
    }
    if (market.handicap != null) return Math.abs(market.handicap)
    return Math.abs(index - middle)
  }
  let best = 0
  for (let i = 1; i < markets.length; i++) {
    const more = markets[i].rows.length - markets[best].rows.length
    if (more > 0 || (more === 0 && distance(markets[i], i) < distance(markets[best], best))) {
      best = i
    }
  }
  return markets[best]
}

export interface MarketSelection {
  group: BestOddsMarketGroup
  variant: BestOddsVariant
  market: BestOddsMarket
}

/** The market with that id, or the one the event opens on: the first type, its first period. */
export function selectMarket(
  groups: readonly BestOddsMarketGroup[],
  marketId: string | null | undefined,
): MarketSelection | null {
  if (marketId) {
    for (const group of groups) {
      for (const variant of group.variants) {
        const market = variant.markets.find((m) => m.id === marketId)
        if (market) return { group, variant, market }
      }
    }
  }
  const group = groups[0]
  const variant = group?.variants[0]
  const market = variant ? defaultMarket(variant.markets) : null
  return group && variant && market ? { group, variant, market } : null
}

/* ---------- Who pays the most ---------- */

/** What a back price pays: on an exchange the commission comes off the winnings. */
export function netOdds(odds: number, isExchange: boolean, commission: number): number {
  return isExchange ? 1 + (odds - 1) * (1 - commission) : odds
}

/** Two prices this close are the same price (the exchange nets have more than two decimals). */
const SAME_PRICE = 1e-9

export interface RankedPrice {
  bookmaker: BestOddsBookmaker
  /** The price as the site shows it; null when the site prices the market but not this outcome. */
  odds: number | null
  /** What it pays: the price, net of the commission on an exchange. */
  net: number | null
  /** The lay price of the outcome, on an exchange that shows one. */
  lay: number | null
  /** 1 for who pays the most; sites that pay the same share the place. Null without a price. */
  rank: number | null
  best: boolean
  /** How much less than the best it pays, in price points; 0 for the best. */
  gap: number | null
  /** The whole row of the site on the market: the other outcomes, the age. */
  row: BestOddsMarketRow
}

function bookmakerOf(slug: string, bookmakers: readonly BestOddsBookmaker[]): BestOddsBookmaker {
  return (
    bookmakers.find((b) => b.slug === slug) ?? {
      slug,
      name: slug,
      isExchange: false,
      eventUrl: null,
    }
  )
}

/**
 * The sites that price a market, from the one that pays the most on `outcomeKey` down; the ones
 * that price the market but not that outcome close the list, by name.
 */
export function rankMarket(
  market: BestOddsMarket,
  outcomeKey: string,
  bookmakers: readonly BestOddsBookmaker[],
  commission: number,
): RankedPrice[] {
  const rows = market.rows.map((row) => {
    const bookmaker = bookmakerOf(row.bookmaker, bookmakers)
    const odds = row.odds[outcomeKey]
    const priced = typeof odds === 'number' && odds > 1
    return {
      bookmaker,
      odds: priced ? odds : null,
      net: priced ? netOdds(odds, bookmaker.isExchange, commission) : null,
      lay: row.lay?.[outcomeKey] ?? null,
      row,
    }
  })
  rows.sort(
    (a, b) => (b.net ?? 0) - (a.net ?? 0) || collator.compare(a.bookmaker.name, b.bookmaker.name),
  )
  const top = rows[0]?.net ?? null
  let rank = 0
  let previous: number | null = null
  return rows.map((entry, index) => {
    if (entry.net == null || top == null) {
      return { ...entry, rank: null, best: false, gap: null }
    }
    if (previous == null || previous - entry.net > SAME_PRICE) rank = index + 1
    previous = entry.net
    const gap = top - entry.net
    return { ...entry, rank, best: rank === 1, gap: gap > SAME_PRICE ? gap : 0 }
  })
}

export interface OutcomeBest {
  /** What the best site pays, net of the commission when it is an exchange. */
  net: number
  /** The sites that pay it. */
  bookmakers: BestOddsBookmaker[]
  /** How many sites price the outcome. */
  sites: number
}

/** For each outcome of a market: the best price, who has it and how many sites price it. */
export function bestByOutcome(
  market: BestOddsMarket,
  bookmakers: readonly BestOddsBookmaker[],
  commission: number,
): Record<string, OutcomeBest | undefined> {
  const best: Record<string, OutcomeBest | undefined> = {}
  for (const outcome of market.outcomes) {
    const ranked = rankMarket(market, outcome.key, bookmakers, commission)
    const leaders = ranked.filter((r) => r.best)
    if (leaders.length === 0 || leaders[0].net == null) continue
    best[outcome.key] = {
      net: leaders[0].net,
      bookmakers: leaders.map((r) => r.bookmaker),
      sites: ranked.filter((r) => r.odds != null).length,
    }
  }
  return best
}

/* ---------- The address of the page ---------- */

/** What the page shows, as its address says it. */
export interface BestOddsView {
  /** The sport as the catalog names it; null = the first of the catalog. */
  sport: string | null
  competitionId: string | null
  eventId: string | null
  /** The next events of the sport (on a phone: the list instead of the catalog). */
  upcoming: boolean
  /** Page of the list, from zero. */
  page: number
}

export const EMPTY_BEST_ODDS_VIEW: BestOddsView = {
  sport: null,
  competitionId: null,
  eventId: null,
  upcoming: false,
  page: 0,
}

/** ?sport=Football&campionato=<id>&evento=<id>&vista=prossimi&pagina=2 */
export function parseBestOddsView(params: { get(name: string): string | null }): BestOddsView {
  const text = (name: string) => {
    const value = params.get(name)?.trim()
    return value ? value : null
  }
  const page = Number.parseInt(params.get('pagina') ?? '', 10)
  return {
    sport: text('sport'),
    competitionId: text('campionato'),
    eventId: text('evento'),
    upcoming: params.get('vista') === 'prossimi',
    page: Number.isFinite(page) && page > 1 ? page - 1 : 0,
  }
}

/** The address of a view; what is at its default stays out of it. */
export function bestOddsHref(view: Partial<BestOddsView>): string {
  const params = new URLSearchParams()
  if (view.sport) params.set('sport', view.sport)
  if (view.competitionId) params.set('campionato', view.competitionId)
  if (view.upcoming && !view.competitionId) params.set('vista', 'prossimi')
  if (view.page && view.page > 0) params.set('pagina', String(view.page + 1))
  if (view.eventId) params.set('evento', view.eventId)
  const query = params.toString()
  return query ? `${BEST_ODDS_PATH}?${query}` : BEST_ODDS_PATH
}
