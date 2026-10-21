/**
 * Ritorno di una copertura giocata a pezzi (contropuntate parziali di punta-punta e tri-punta,
 * §14.270): ogni importo già giocato vale alla quota a cui è stato giocato e il resto alla
 * quota nuova dell'ultimo passo.
 *
 * Il passo i ha giocato `amount` alla quota di prima: la quota iniziale per il primo, la
 * `newOdds` del passo precedente per gli altri. `restStake` è il resto calcolato per l'ultimo
 * passo, alla sua `newOdds`. Null se manca un importo o una quota.
 */
export function partialCoverReturn(
  baseOdds: number | null,
  steps: { amount: number | null; newOdds: number | null }[],
  restStake: number | null,
): number | null {
  if (baseOdds == null || steps.length === 0 || restStake == null) return null
  let total = 0
  for (let i = 0; i < steps.length; i++) {
    const { amount } = steps[i]
    const odds = i === 0 ? baseOdds : steps[i - 1].newOdds
    if (amount == null || odds == null) return null
    total += amount * odds
  }
  const lastOdds = steps[steps.length - 1].newOdds
  if (lastOdds == null) return null
  total += restStake * lastOdds
  return Number.isFinite(total) ? total : null
}
