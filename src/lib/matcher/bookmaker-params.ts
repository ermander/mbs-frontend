/**
 * The `cover_bookmakers` parameter of GET /matcher/results (§14.102): the
 * bookmakers the legs other than the chosen book may sit on. A selection in
 * either list restricts that kind; the list left empty means «all of that
 * kind». Nothing selected in both: no parameter. Sorted, so the same
 * selection gives the same query key.
 */
export function coverBookmakersParam(
  selectedCoverBooks: string[],
  selectedExchanges: string[],
  allBooks: string[],
  allExchanges: string[],
): string | undefined {
  if (selectedCoverBooks.length === 0 && selectedExchanges.length === 0) return undefined
  const books = selectedCoverBooks.length > 0 ? selectedCoverBooks : allBooks
  const exchanges = selectedExchanges.length > 0 ? selectedExchanges : allExchanges
  return [...new Set([...books, ...exchanges])].sort().join(',')
}

/** The `bookmaker` parameter: the chosen books, sorted for a stable query key. */
export function bookmakersParam(selectedBooks: string[]): string | undefined {
  if (selectedBooks.length === 0) return undefined
  return [...new Set(selectedBooks)].sort().join(',')
}
