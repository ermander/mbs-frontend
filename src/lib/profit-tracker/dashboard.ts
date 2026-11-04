/**
 * Conti della Dashboard del tracker dal design OddWise (§14.336): serie dei dodici mesi, scala del
 * grafico a barre (anche sotto lo zero), note dei riquadri. Tutto puro, per i test.
 */

import type { Account, BetLegRealizedLedgerSummaryBucket, Wallet } from '@/types/profit-tracker'

const MINUS = '−'
const NBSP = ' '

// Il design raggruppa le migliaia anche a quattro cifre («2.431,90 €»), a differenza di it-IT puro.
const nf2 = new Intl.NumberFormat('it-IT', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: 'always',
})
const nf0 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0, useGrouping: 'always' })

export const MONTH_SHORT = [
  'Gen',
  'Feb',
  'Mar',
  'Apr',
  'Mag',
  'Giu',
  'Lug',
  'Ago',
  'Set',
  'Ott',
  'Nov',
  'Dic',
] as const
export const MONTH_FULL = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
] as const

function signOf(n: number, explicitPlus: boolean): string {
  if (n < 0) return MINUS
  return n > 0 && explicitPlus ? '+' : ''
}

/** «+1.512,40 €», «−3,15 €»; con `sign: false` il più sparisce (saldi). */
export function dashMoney(value: number, opts: { sign?: boolean } = {}): string {
  const n = Number.isFinite(value) ? value : 0
  return `${signOf(n, opts.sign !== false)}${nf2.format(Math.abs(n))}${NBSP}€`
}

/** Importo intero degli assi e delle etichette sulle barre: «6.401 €», «−120 €». */
export function dashMoneyRound(value: number): string {
  const n = Math.round(Number.isFinite(value) ? value : 0)
  return `${signOf(n, false)}${nf0.format(Math.abs(n))}${NBSP}€`
}

/**
 * Il profitto dei dodici mesi di `year`: un numero per ogni mese già iniziato (0 se senza
 * movimenti), null per i mesi futuri. I bucket arrivano dal backend troncati al mese in UTC.
 */
export function monthlySeries(
  buckets: BetLegRealizedLedgerSummaryBucket[],
  year: number,
  now: Date,
): (number | null)[] {
  const byMonth = new Map<number, number>()
  for (const b of buckets) {
    const d = new Date(b.periodStart)
    if (d.getUTCFullYear() !== year) continue
    byMonth.set(d.getUTCMonth(), (byMonth.get(d.getUTCMonth()) ?? 0) + b.total)
  }
  const lastMonth = now.getFullYear() > year ? 11 : now.getFullYear() < year ? -1 : now.getMonth()
  return MONTH_SHORT.map((_, m) => (m > lastMonth ? null : (byMonth.get(m) ?? 0)))
}

/** La somma progressiva da gennaio; i mesi futuri restano null. */
export function cumulativeSeries(series: (number | null)[]): (number | null)[] {
  let run = 0
  return series.map((v) => {
    if (v === null) return null
    run += v
    return run
  })
}

/** Passo «tondo» (1, 2, 2,5, 5 × 10^k) non inferiore a x. */
export function niceStep(x: number): number {
  if (!(x > 0)) return 1
  const p = Math.pow(10, Math.floor(Math.log10(x)))
  const m = x / p
  const s = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10
  return s * p
}

export interface ChartScale {
  /** Valore in cima e in fondo all'asse; lo zero è sempre compreso. */
  top: number
  bottom: number
  ticks: number[]
}

/**
 * La scala del grafico: circa quattro intervalli tondi da `bottom` a `top`. Il design parte da zero;
 * qui l'asse scende sotto lo zero quando un mese (o il cumulato) è in perdita, perché una perdita
 * non deve sparire dal grafico.
 */
export function chartScale(series: (number | null)[]): ChartScale {
  const values = series.filter((v): v is number => v !== null)
  const hi = Math.max(0, ...values)
  const lo = Math.min(0, ...values)
  const step = niceStep((hi - lo || 1) / 4)
  const top = hi > 0 ? Math.ceil(hi / step - 1e-9) * step : lo < 0 ? 0 : step
  const bottom = lo < 0 ? Math.floor(lo / step + 1e-9) * step : 0
  const n = Math.round((top - bottom) / step)
  const ticks = Array.from({ length: n + 1 }, (_, i) => bottom + i * step)
  return { top, bottom, ticks }
}

/** Posizione di un valore sull'asse, da 0 (fondo) a 1 (cima). */
export function scalePosition(value: number, scale: ChartScale): number {
  const span = scale.top - scale.bottom
  return span > 0 ? (value - scale.bottom) / span : 0
}

/** «Skrill, Neteller e PayPal»; oltre tre nomi «Skrill, Neteller e altri 3». */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  if (names.length <= 3) return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`
  return `${names.slice(0, 2).join(', ')} e altri ${names.length - 2}`
}

export interface DashboardBalances {
  saldoBookmakers: number
  saldoWallets: number
  prelieviInAttesa: number
  puntateInCorso: number
  /** Bookmaker + wallet + prelievi in attesa + puntate in corso (formula invariata dal §14.109). */
  saldoTotale: number
  saldoBloccato: number
  saldoBloccatoConti: number
  saldoBloccatoWallets: number
  bookNote: string
  walletNote: string
  bloccatoNote: string
}

export function dashboardBalances(
  accounts: Account[],
  wallets: Wallet[],
  puntateInCorso: number,
): DashboardBalances {
  const sum = <T extends { saldoAttuale: number }>(xs: T[]) =>
    xs.reduce((s, x) => s + x.saldoAttuale, 0)
  const saldoBookmakers = sum(accounts)
  const saldoWallets = sum(wallets)
  // §14.109: i prelievi in attesa sono soldi usciti dal conto e non ancora nel wallet.
  const prelieviInAttesa = wallets.reduce((s, w) => s + (w.inAttesa ?? 0), 0)
  const saldoBloccatoConti = sum(accounts.filter((a) => a.bloccato))
  const saldoBloccatoWallets = sum(wallets.filter((w) => w.bloccato))
  const saldoBloccato = saldoBloccatoConti + saldoBloccatoWallets

  const contiAttivi = accounts.filter((a) => a.stato === 'abilitato').length
  const bookNote =
    contiAttivi === 0
      ? 'Nessun conto attivo'
      : `Su ${contiAttivi} ${contiAttivi === 1 ? 'conto attivo' : 'conti attivi'}`

  const metodi = [
    ...new Set(wallets.filter((w) => w.stato === 'abilitato').map((w) => w.nome.trim())),
  ].filter(Boolean)
  const walletNote = metodi.length === 0 ? 'Nessun wallet attivo' : joinNames(metodi)

  const bloccatoNote =
    !accounts.some((a) => a.bloccato) && !wallets.some((w) => w.bloccato)
      ? 'Nessun importo bloccato'
      : `Conti ${dashMoney(saldoBloccatoConti, { sign: false })} · Wallet ${dashMoney(saldoBloccatoWallets, { sign: false })}`

  return {
    saldoBookmakers,
    saldoWallets,
    prelieviInAttesa,
    puntateInCorso,
    saldoTotale: saldoBookmakers + saldoWallets + prelieviInAttesa + puntateInCorso,
    saldoBloccato,
    saldoBloccatoConti,
    saldoBloccatoWallets,
    bookNote,
    walletNote,
    bloccatoNote,
  }
}

export interface DashboardProfit {
  meseAttuale: number
  mediaMensile: number
  totaleAnno: number
  /** «al 4 novembre» */
  meseNote: string
  /** «su 11 mesi del 2026» */
  mediaNote: string
  /** «Da gennaio 2026» */
  annoNote: string
  /** Nessun mese con un profitto diverso da zero: il grafico lascia il posto allo stato vuoto. */
  isEmpty: boolean
}

export function dashboardProfit(
  series: (number | null)[],
  rangeTotal: number,
  year: number,
  now: Date,
): DashboardProfit {
  const started = series.filter((v): v is number => v !== null)
  const meseAttuale = now.getFullYear() === year ? (series[now.getMonth()] ?? 0) : 0
  const mesi = started.length
  return {
    meseAttuale,
    mediaMensile: mesi > 0 ? rangeTotal / mesi : 0,
    totaleAnno: rangeTotal,
    meseNote: `al ${now.getDate()} ${MONTH_FULL[now.getMonth()].toLowerCase()}`,
    mediaNote: `su ${mesi} ${mesi === 1 ? 'mese' : 'mesi'} del ${year}`,
    annoNote: `Da gennaio ${year}`,
    isEmpty: started.every((v) => v === 0),
  }
}
