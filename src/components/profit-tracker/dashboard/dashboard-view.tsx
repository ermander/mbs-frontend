'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Calculator,
  Clock,
  Euro,
  ListChecks,
  Lock,
  RefreshCw,
  Scale,
  TrendingUp,
  Wallet,
} from 'lucide-react'

import { ProfitMonthChart } from '@/components/profit-tracker/dashboard/profit-month-chart'
import {
  DS_TILE_GRID as TILE_GRID,
  DsSection as Section,
  DsStatTile as DashStatTile,
} from '@/components/profit-tracker/tracker-ds'
import { dashboardBalances, dashboardProfit, monthlySeries } from '@/lib/profit-tracker/dashboard'
import {
  getPuntateInCorsoTotale,
  getUnifiedProfitSummary,
} from '@/services/api/profit-tracker-client'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { BetLegRealizedLedgerSummaryResult } from '@/types/profit-tracker'

/**
 * I sei saldi su righe piene: 2 + 2 + 2 sul tablet, 3 + 3 sul portatile, tutti e sei in fila dai
 * 1800px. Con la pagina a tutta larghezza (§14.357) la griglia a riempimento dava 5 + 1 tra 1600 e
 * 1900px.
 */
const SALDI_GRID = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 min-[112.5rem]:grid-cols-6'

/** La Dashboard del tracker dal design OddWise (§14.336): saldi, profitto dell'anno e grafico. */
export function DashboardView() {
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const wallets = useProfitTrackerStore((s) => s.wallets)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const fetchWallets = useProfitTrackerStore((s) => s.fetchWallets)

  // L'istante della pagina: anno, mese in corso e «al 4 novembre» restano fermi finché resta aperta.
  const [now] = useState(() => new Date())
  const year = now.getFullYear()

  const [summary, setSummary] = useState<BetLegRealizedLedgerSummaryResult | null>(null)
  const [puntateInCorso, setPuntateInCorso] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    void fetchAllAccounts()
    void fetchWallets()
    Promise.all([
      getUnifiedProfitSummary({
        granularity: 'month',
        fromDate: `${year}-01-01T00:00:00Z`,
        toDate: `${year}-12-31T23:59:59Z`,
      }),
      getPuntateInCorsoTotale(),
    ])
      .then(([s, p]) => {
        setSummary(s)
        setPuntateInCorso(p.totale)
      })
      .catch((err) => {
        console.error('Dashboard data fetch error:', err)
        setLoadError(
          'Non è stato possibile caricare il profitto e le puntate in corso. Ricarica la pagina.',
        )
      })
      .finally(() => setIsLoading(false))
  }, [fetchAllAccounts, fetchWallets, year])

  const saldi = useMemo(
    () => dashboardBalances(allAccounts, wallets, puntateInCorso),
    [allAccounts, wallets, puntateInCorso],
  )
  const series = useMemo(
    () => monthlySeries(summary?.buckets ?? [], year, now),
    [summary, year, now],
  )
  const profit = useMemo(
    () => dashboardProfit(series, summary?.rangeTotal ?? 0, year, now),
    [series, summary, year, now],
  )

  return (
    <div className="flex flex-col gap-8">
      <h1 className="ds-title m-0 -mb-2">Dashboard</h1>

      {loadError && (
        <p
          role="alert"
          className="ds-body-sm m-0 rounded-ds-sm bg-ds-loss-soft px-3 py-2 text-ds-loss"
        >
          {loadError}
        </p>
      )}

      <Section id="h-saldi" title="Saldi">
        <div className={SALDI_GRID}>
          <DashStatTile
            label="Saldo totale"
            value={saldi.saldoTotale}
            note="Bookmaker, wallet, prelievi in attesa e puntate in corso"
            icon={Euro}
            isLoading={isLoading}
          />
          <DashStatTile
            label="Saldo bookmaker"
            value={saldi.saldoBookmakers}
            note={saldi.bookNote}
            icon={Scale}
          />
          <DashStatTile
            label="Saldo wallet"
            value={saldi.saldoWallets}
            note={saldi.walletNote}
            icon={Wallet}
          />
          <DashStatTile
            label="Prelievi in attesa"
            value={saldi.prelieviInAttesa}
            note="Usciti dai conti, non ancora sui wallet"
            icon={Clock}
          />
          <DashStatTile
            label="Saldo bloccato"
            value={saldi.saldoBloccato}
            note={saldi.bloccatoNote}
            icon={Lock}
          />
          <DashStatTile
            label="Puntate in corso"
            value={saldi.puntateInCorso}
            note="Importi ancora sulle giocate aperte"
            icon={RefreshCw}
            isLoading={isLoading}
          />
        </div>
      </Section>

      <Section id="h-profitto" title={`Profitto ${year}`}>
        <div className={TILE_GRID}>
          <DashStatTile
            label="Mese attuale"
            value={profit.meseAttuale}
            note={profit.meseNote}
            icon={TrendingUp}
            signed
            isLoading={isLoading}
          />
          <DashStatTile
            label="Media mensile"
            value={profit.mediaMensile}
            note={profit.mediaNote}
            icon={Calculator}
            signed
            isLoading={isLoading}
          />
          <DashStatTile
            label="Totale anno"
            value={profit.totaleAnno}
            note={profit.annoNote}
            icon={ListChecks}
            signed
            isLoading={isLoading}
          />
        </div>

        <ProfitMonthChart
          year={year}
          series={series}
          currentMonth={now.getMonth()}
          isLoading={isLoading}
          isEmpty={!loadError && profit.isEmpty}
        />
      </Section>
    </div>
  )
}
