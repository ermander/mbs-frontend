export function calcolaMovimento(stake: number, quota: number, commissionePercent: number): number {
  if (stake <= 0 || quota <= 1) return 0
  const lordo = stake * (quota - 1)
  const commissione = lordo * (commissionePercent / 100)
  const netto = lordo - commissione
  return Number.isFinite(netto) ? Number(netto.toFixed(2)) : 0
}
