import type { MatcherLeg, MatcherMeta } from '@/types/matcher'
import type { SportType } from '@/types/profit-tracker'

/**
 * Identity of the bookmakers of the internal engine (od_bookmakers slugs) on the
 * frontend: logos, short names, sport labels and the link to the Profit Tracker
 * books. The logo files in `public/loghi_book` are still named after the numeric
 * ids of the RobinOdds scanner removed in §14.100, hence the map below.
 */

const LOGO_FILE_BY_SLUG: Record<string, string> = {
  '888sport': '14',
  admiralbet: '28',
  bet365: '2',
  betfairsportsbook: '5',
  betfair: '36',
  betflag: '6',
  betpassion: '46',
  betpoint: '23',
  betsson: '19',
  bwin: '10',
  codere: '47',
  daznbet: '17',
  domusbet: '12',
  eplay24: '22',
  eurobet: '13',
  goldbet: '16',
  leovegas: '18',
  marathonbet: '1',
  netwin: '45',
  perlaplay: '49',
  planetwin365: '21',
  pokerstars: '8',
  quigioco: '39',
  sisal: '24',
  snai: '26',
  sportbet: '37',
  stake: '41',
  stanleybet: '30',
  starcasino: '31',
  totosi: '34',
  vincitu: '44',
  williamhill: '33',
  winbet: '40',
  zonagioco: '42',
}

/** Path of the logo for a bookmaker slug, null when there is none: the caller falls back to the name. */
export function bookmakerLogoSrc(slug: string): string | null {
  const file = LOGO_FILE_BY_SLUG[slug.toLowerCase()]
  return file ? `/loghi_book/${file}.png` : null
}

/** "Sisal (PokerStars · Snai)" → "Sisal": the aliases in the display name are noise in a table cell. */
export function shortBookmakerName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, '').trim() || name
}

/** Meta lookup by slug; undefined when the meta is missing or predates §14.95. */
function metaIsExchange(slug: string, meta: MatcherMeta | null | undefined): boolean | undefined {
  const entry = meta?.bookmakers.find((b) => b.slug === slug)
  return entry && typeof entry.isExchange === 'boolean' ? entry.isExchange : undefined
}

/**
 * Whether a leg sits on an exchange: the flag on the leg (§14.95), else the
 * meta, else the LAY prefix a back/lay row puts on its exchange leg.
 */
export function legIsExchange(leg: MatcherLeg, meta?: MatcherMeta | null): boolean {
  if (typeof leg.isExchange === 'boolean') return leg.isExchange
  const fromMeta = metaIsExchange(leg.bookmakerSlug, meta)
  if (fromMeta !== undefined) return fromMeta
  return leg.outcomeLabel.startsWith('LAY ')
}

/** Default when the backend does not say (older image or cached meta): the engine's own default. */
export const DEFAULT_EXCHANGE_COMMISSION = 0.045

/** Commission as a fraction (0.045) from the meta, with the engine default as fallback. */
export function exchangeCommissionOf(meta: MatcherMeta | null | undefined): number {
  const c = meta?.exchangeCommission
  return typeof c === 'number' && Number.isFinite(c) && c >= 0 && c < 1
    ? c
    : DEFAULT_EXCHANGE_COMMISSION
}

export interface SportDisplay {
  label: string
  icon: string
  /** The sport as the Profit Tracker wants it. */
  ptSport: SportType
}

/** The engine names sports the api-sports way ("Football"); the UI and the Profit Tracker speak Italian. */
export function sportDisplay(sportName: string): SportDisplay {
  switch (sportName.trim().toLowerCase()) {
    case 'football':
    case 'soccer':
    case 'calcio':
      return { label: 'Calcio', icon: '⚽', ptSport: 'calcio' }
    case 'basketball':
    case 'basket':
      return { label: 'Basket', icon: '🏀', ptSport: 'basket' }
    case 'tennis':
      return { label: 'Tennis', icon: '🎾', ptSport: 'tennis' }
    default:
      return { label: sportName, icon: '', ptSport: 'altro' }
  }
}

export interface ProfitTrackerBookLike {
  id: string
  nome: string
  isExchange?: boolean
  externalId?: string | null
}

export interface BookmakerIdentity {
  slug: string
  name: string
  /** When known, only books of the same kind are candidates (Betfair exchange vs Betfair sportsbook). */
  isExchange?: boolean
}

function squash(s: string): string {
  return s
    .toLowerCase()
    .replace(/\.it$/, '')
    .replace(/[^a-z0-9]/g, '')
}

/**
 * The Profit Tracker book behind an engine bookmaker: first the explicit link
 * (`externalId` = slug, set from the backoffice), then the name, the way the old
 * scanner does it ("Bet365" ↔ "Bet365.it"). Null when nothing matches; the
 * caller then tells the user to link the book.
 */
export function resolveProfitTrackerBook<T extends ProfitTrackerBookLike>(
  books: T[],
  bookmaker: BookmakerIdentity,
): T | null {
  const slug = bookmaker.slug.trim().toLowerCase()
  const candidates =
    typeof bookmaker.isExchange === 'boolean'
      ? books.filter((b) => (b.isExchange ?? false) === bookmaker.isExchange)
      : books
  const byExternalId = candidates.find((b) => (b.externalId ?? '').trim().toLowerCase() === slug)
  if (byExternalId) return byExternalId

  const shortName = shortBookmakerName(bookmaker.name)
  const wanted = squash(shortName)
  const wantedSlug = squash(slug)
  const exact = candidates.find((b) => {
    const nome = squash(b.nome)
    return nome === wanted || nome === wantedSlug
  })
  if (exact) return exact
  const prefix = candidates.find((b) => {
    const nome = squash(b.nome)
    return nome.startsWith(wanted) || wanted.startsWith(nome)
  })
  return prefix ?? null
}
