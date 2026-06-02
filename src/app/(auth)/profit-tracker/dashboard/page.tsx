'use client'

import { useEffect, useMemo, useState } from 'react'
import { Scale, Wallet, Loader2, Banknote, PieChart, UserCog, Lock } from 'lucide-react'

import { ProfitTrackerPageShell } from '@/components/profit-tracker/profit-tracker-page-shell'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { useAuthStore } from '@/stores/auth-store'
import {
  getUnifiedProfitSummary,
  getPuntateInCorsoTotale,
  getBetLegRealizedLedger,
  getCollaboratorBreakdown,
  type CollaboratorBreakdownEntry,
} from '@/services/api/profit-tracker-client'
import type {
  BetLegRealizedLedgerSummaryResult,
  BetLegRealizedLedgerEntry,
} from '@/types/profit-tracker'

const SPORT_ICON: Record<string, string> = {
  calcio: '⚽',
  tennis: '🎾',
  basket: '🏀',
  altro: '•',
}
function getSportIcon(sport: string) {
  return SPORT_ICON[sport?.toLowerCase()] ?? '•'
}

function formatCurrency(value: number): string {
  return value.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

const BALANCE_ICON_CLASS = 'size-8 rounded-full bg-amber-500/15 p-1.5 text-amber-400'
const CURRENT_YEAR = new Date().getFullYear()

export default function ProfitTrackerDashboardPage() {
  const userRole = useAuthStore((s) => s.user?.role)
  const isCollaborator = userRole === 'COLLABORATOR_ROLE'
  const isAdmin = userRole === 'ADMIN_ROLE'
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const wallets = useProfitTrackerStore((s) => s.wallets)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const fetchWallets = useProfitTrackerStore((s) => s.fetchWallets)
  const ongoingBets = useProfitTrackerStore((s) => s.ongoingBets)
  const fetchOngoingBets = useProfitTrackerStore((s) => s.fetchOngoingBets)

  const [ledgerSummary, setLedgerSummary] = useState<BetLegRealizedLedgerSummaryResult | null>(null)
  const [recentLedgerEntries, setRecentLedgerEntries] = useState<BetLegRealizedLedgerEntry[]>([])
  const [puntateInCorsoValue, setPuntateInCorsoValue] = useState(0)
  const [collaboratorBreakdown, setCollaboratorBreakdown] = useState<CollaboratorBreakdownEntry[]>(
    [],
  )

  useEffect(() => {
    void fetchAllAccounts()
    void fetchWallets()
    void fetchOngoingBets()

    const fromDate = `${CURRENT_YEAR}-01-01T00:00:00Z`
    const toDate = `${CURRENT_YEAR}-12-31T23:59:59Z`

    Promise.all([
      getUnifiedProfitSummary({ granularity: 'month', fromDate, toDate }),
      getBetLegRealizedLedger({ limit: 5, page: 1 }),
      getPuntateInCorsoTotale(),
    ])
      .then(([summary, ledgerList, puntate]) => {
        setLedgerSummary(summary)
        setRecentLedgerEntries(ledgerList.items)
        setPuntateInCorsoValue(puntate.totale)
      })
      .catch((err) => {
        console.error('Dashboard data fetch error:', err)
      })

    if (isAdmin) {
      getCollaboratorBreakdown({ fromDate, toDate })
        .then(setCollaboratorBreakdown)
        .catch((err) => {
          console.error('Collaborator breakdown fetch error:', err)
        })
    }
  }, [fetchAllAccounts, fetchWallets, fetchOngoingBets, isAdmin])

  const bilancio = useMemo(() => {
    const saldoBookmakers = allAccounts.reduce((sum, a) => sum + a.saldoAttuale, 0)
    const saldoWallets = wallets.reduce((sum, w) => sum + w.saldoAttuale, 0)
    const saldoTotale = saldoBookmakers + saldoWallets + puntateInCorsoValue
    const saldoBloccatoConti = allAccounts
      .filter((a) => a.bloccato)
      .reduce((sum, a) => sum + a.saldoAttuale, 0)
    const saldoBloccatoWallets = wallets
      .filter((w) => w.bloccato)
      .reduce((sum, w) => sum + w.saldoAttuale, 0)
    const saldoBloccato = saldoBloccatoConti + saldoBloccatoWallets
    return {
      saldoBookmakers,
      saldoWallets,
      puntateInCorso: puntateInCorsoValue,
      saldoTotale,
      saldoBloccato,
      saldoBloccatoConti,
      saldoBloccatoWallets,
    }
  }, [allAccounts, wallets, puntateInCorsoValue])

  const kpi = useMemo(() => {
    if (!ledgerSummary) {
      return { totaleAnno: 0, mediaMensile: 0, meseAttuale: 0 }
    }

    const totaleAnno = ledgerSummary.rangeTotal

    const now = new Date()
    const currentBucket = ledgerSummary.buckets.find((b) => {
      const d = new Date(b.periodStart)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    })
    const meseAttuale = currentBucket?.total ?? 0

    const elapsedMonths = now.getMonth() + 1
    const mediaMensile = elapsedMonths > 0 ? totaleAnno / elapsedMonths : 0

    return { totaleAnno, mediaMensile, meseAttuale }
  }, [ledgerSummary])

  const monthlyTrend = useMemo(() => {
    const result = new Array(12).fill(0) as number[]
    if (!ledgerSummary) return result

    for (const bucket of ledgerSummary.buckets) {
      const date = new Date(bucket.periodStart)
      if (date.getFullYear() === CURRENT_YEAR) {
        result[date.getMonth()] = bucket.total
      }
    }
    return result
  }, [ledgerSummary])

  const activeOngoingBets = useMemo(() => ongoingBets.filter((b) => !b.archiviata), [ongoingBets])

  const trendMax = Math.max(...monthlyTrend.map(Math.abs), 1)

  return (
    <ProfitTrackerPageShell
      sectionTitle="Dashboard"
      sectionDescription="Quadro sintetico di saldi, performance e attività recenti."
    >
      <div className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Bilancio
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="flex items-start justify-between rounded-xl border border-border bg-card/70 p-4 shadow-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Saldo Bookmakers
              </p>
              <p className="mt-2 font-mono text-2xl font-semibold text-foreground">
                {formatCurrency(bilancio.saldoBookmakers)}
              </p>
            </div>
            <div className={BALANCE_ICON_CLASS}>
              <Scale className="size-full" />
            </div>
          </div>
          <div className="flex items-start justify-between rounded-xl border border-border bg-card/70 p-4 shadow-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Saldo Wallets
              </p>
              <p className="mt-2 font-mono text-2xl font-semibold text-foreground">
                {formatCurrency(bilancio.saldoWallets)}
              </p>
            </div>
            <div className={BALANCE_ICON_CLASS}>
              <Wallet className="size-full" />
            </div>
          </div>
          <div className="flex items-start justify-between rounded-xl border border-border bg-card/70 p-4 shadow-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Saldo bloccato
              </p>
              <p className="mt-2 font-mono text-2xl font-semibold text-amber-400">
                {formatCurrency(bilancio.saldoBloccato)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Conti: {formatCurrency(bilancio.saldoBloccatoConti)} · Wallet:{' '}
                {formatCurrency(bilancio.saldoBloccatoWallets)}
              </p>
            </div>
            <div className="size-8 rounded-full bg-amber-500/15 p-1.5 text-amber-400">
              <Lock className="size-full" />
            </div>
          </div>
          <div className="flex items-start justify-between rounded-xl border border-border bg-card/70 p-4 shadow-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Puntate in corso
              </p>
              <p className="mt-2 font-mono text-2xl font-semibold text-foreground">
                {formatCurrency(bilancio.puntateInCorso)}
              </p>
            </div>
            <div className={BALANCE_ICON_CLASS}>
              <Loader2 className="size-full" />
            </div>
          </div>
          <div className="flex items-start justify-between rounded-xl border border-border bg-card/70 p-4 shadow-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Saldo Totale
              </p>
              <p className="mt-2 font-mono text-2xl font-semibold text-foreground">
                {formatCurrency(bilancio.saldoTotale)}
              </p>
            </div>
            <div className={BALANCE_ICON_CLASS}>
              <Banknote className="size-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Mese attuale
          </p>
          <p className="mt-2 font-mono text-2xl font-semibold text-foreground">
            {formatCurrency(kpi.meseAttuale)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Profitto realizzato nel mese in corso.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Media mensile
          </p>
          <p className="mt-2 font-mono text-2xl font-semibold text-foreground">
            {formatCurrency(kpi.mediaMensile)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Media mensile dei guadagni sull&apos;anno corrente.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Totale anno {CURRENT_YEAR}
          </p>
          <p className="mt-2 font-mono text-2xl font-semibold text-foreground">
            {formatCurrency(kpi.totaleAnno)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Somma di tutti i profitti realizzati.
          </p>
        </div>
      </div>

      {isCollaborator && ledgerSummary && ledgerSummary.sharePercentage != null && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Mia quota ({ledgerSummary.sharePercentage}%)
              </p>
              <PieChart className="size-5 text-emerald-500" />
            </div>
            <p className="mt-2 font-mono text-2xl font-semibold text-emerald-400">
              {formatCurrency(ledgerSummary.myShareAmount ?? 0)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Quota a te derivante dalle operazioni che hai effettuato nell&apos;anno {CURRENT_YEAR}
              .
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Quota admin ({Math.max(0, 100 - ledgerSummary.sharePercentage)}%)
              </p>
              <UserCog className="size-5 text-muted-foreground" />
            </div>
            <p className="mt-2 font-mono text-2xl font-semibold text-foreground">
              {formatCurrency(ledgerSummary.adminShareAmount ?? 0)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Quota destinata all&apos;admin (proprietario di conti e capitale).
            </p>
          </div>
        </div>
      )}

      {isAdmin && collaboratorBreakdown.length > 0 && (
        <div className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-foreground">
              Performance collaboratori {CURRENT_YEAR}
            </p>
            <p className="text-xs text-muted-foreground">
              Profitto generato da ogni collaboratore e split secondo la quota configurata.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Collaboratore
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                    Quota %
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                    Profitto totale
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                    Quota collab.
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                    Tua quota
                  </th>
                </tr>
              </thead>
              <tbody>
                {collaboratorBreakdown.map((c) => (
                  <tr key={c.collaboratorId} className="border-t border-border">
                    <td className="px-3 py-2 text-foreground">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">@{c.username}</div>
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">
                      {c.profitSharePercentage != null ? `${c.profitSharePercentage}%` : '—'}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-mono ${
                        c.totalProfit >= 0 ? 'text-foreground' : 'text-destructive'
                      }`}
                    >
                      {formatCurrency(c.totalProfit)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                      {formatCurrency(c.myShareAmount)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-mono font-semibold ${
                        c.adminShareAmount >= 0 ? 'text-emerald-400' : 'text-destructive'
                      }`}
                    >
                      {formatCurrency(c.adminShareAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-muted/30">
                  <td className="px-3 py-2 font-medium text-foreground">Totale</td>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2 text-right font-mono font-semibold text-foreground">
                    {formatCurrency(collaboratorBreakdown.reduce((s, c) => s + c.totalProfit, 0))}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                    {formatCurrency(collaboratorBreakdown.reduce((s, c) => s + c.myShareAmount, 0))}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-emerald-400">
                    {formatCurrency(
                      collaboratorBreakdown.reduce((s, c) => s + c.adminShareAmount, 0),
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[2fr,1fr] lg:gap-6">
        <div className="min-w-0 rounded-xl border border-border bg-card/70 p-4 shadow-sm">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-foreground">Trend guadagni {CURRENT_YEAR}</p>
            <p className="text-xs text-muted-foreground">Profitto mensile realizzato</p>
          </div>
          <div className="mt-2 h-40 rounded-md bg-muted/40 p-3 sm:h-48">
            <div className="flex h-full items-end gap-1">
              {monthlyTrend.map((value, index) => {
                const barHeight = (Math.abs(value) / trendMax) * 80
                const isNegative = value < 0
                return (
                  <div key={index} className="flex h-full flex-1 flex-col items-center justify-end">
                    <div
                      className={`w-full max-w-3 rounded-full ${isNegative ? 'bg-destructive/70' : 'bg-primary/70'}`}
                      style={{ height: `${Math.max(barHeight, value !== 0 ? 5 : 2)}%` }}
                      title={formatCurrency(value)}
                    />
                  </div>
                )
              })}
            </div>
            <div className="mt-2 flex justify-between gap-0.5 overflow-hidden text-[9px] text-muted-foreground sm:text-[10px]">
              <span>Gen</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>Mag</span>
              <span>Giu</span>
              <span>Lug</span>
              <span>Ago</span>
              <span>Set</span>
              <span>Ott</span>
              <span>Nov</span>
              <span>Dic</span>
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
            <p className="text-sm font-medium text-foreground">Giocate in corso</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Riepilogo rapido delle giocate ancora aperte.
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {activeOngoingBets.slice(0, 3).map((bet) => (
                <li
                  key={bet.id}
                  className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2"
                >
                  <span className="truncate text-foreground">{bet.eventoNome}</span>
                  <span className="text-base" aria-label={bet.sport}>
                    {getSportIcon(bet.sport)}
                  </span>
                </li>
              ))}
              {activeOngoingBets.length === 0 && (
                <li className="text-xs text-muted-foreground">
                  Nessuna giocata in corso registrata al momento.
                </li>
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
            <p className="text-sm font-medium text-foreground">Ultime transazioni</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Ultimi profitti/perdite realizzati.
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {recentLedgerEntries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2"
                >
                  <span className="truncate text-foreground">
                    {new Date(entry.recordedAt).toLocaleDateString('it-IT')}
                  </span>
                  <span
                    className={
                      entry.amount >= 0
                        ? 'font-mono text-xs font-medium text-emerald-400'
                        : 'font-mono text-xs font-medium text-destructive'
                    }
                  >
                    {formatCurrency(entry.amount)}
                  </span>
                </li>
              ))}
              {recentLedgerEntries.length === 0 && (
                <li className="text-xs text-muted-foreground">
                  Non ci sono ancora movimenti registrati.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </ProfitTrackerPageShell>
  )
}
