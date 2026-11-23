import { shortBookmakerName } from '@/lib/bookmakers'
import type { MatcherBookmaker } from '@/types/matcher'

/**
 * «Cerca» of the Oddsmatcher looks for events and competitions only, so «Snai» typed there gives
 * an empty table and the user thinks its prices are missing (§14.375). When the text is the name
 * of a bookmaker of the menus, the bar offers to pick it: these are the bookmakers it offers.
 */

/** Lower case, no accents, letters and digits only: «Casinò di Sanremo» → «casinodisanremo». */
function squash(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/** Shorter than this the text is still a team being typed («bet», «sta»): no suggestion. */
export const MIN_BOOKMAKER_QUERY = 4
/** At most this many suggestions under the bar. */
export const MAX_BOOKMAKER_SUGGESTIONS = 3

/**
 * The bookmakers whose shown name (or slug) starts with the text, exact matches first, the
 * ones already chosen left out. Empty when the text is short or matches none.
 */
export function bookmakersMatchingSearch(
  search: string,
  books: readonly MatcherBookmaker[],
  alreadyChosen: readonly string[] = [],
): MatcherBookmaker[] {
  const q = squash(search)
  if (q.length < MIN_BOOKMAKER_QUERY) return []
  const chosen = new Set(alreadyChosen)
  const scored: Array<{ book: MatcherBookmaker; exact: boolean }> = []
  for (const book of books) {
    if (chosen.has(book.slug)) continue
    const name = squash(shortBookmakerName(book.name))
    const slug = squash(book.slug)
    if (name.startsWith(q) || slug.startsWith(q))
      scored.push({ book, exact: name === q || slug === q })
  }
  return scored
    .sort((a, b) => Number(b.exact) - Number(a.exact))
    .slice(0, MAX_BOOKMAKER_SUGGESTIONS)
    .map((s) => s.book)
}
