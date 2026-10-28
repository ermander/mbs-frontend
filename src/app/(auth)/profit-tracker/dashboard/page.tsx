'use client'

import { useEffect, useMemo, useState } from 'react'
import { Scale, Wallet, Loader2, Banknote, Lock, Hourglass } from 'lucide-react'

import { ProfitTrackerPageShell } from '@/components/profit-tracker/profit-tracker-page-shell'
import { ProfitTrendChart } from '@/components/profit-tracker/dashboard/profit-trend-chart'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import {
  getUnifiedProfitSummary,
  getPuntateInCorsoTotale,
} from '@/services/api/profit-tracker-client'
import type { BetLegRealizedLedgerSummaryResult } from '@/types/profit-tracker'

function formatCurrency(value: number): string {
  return value.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

const BALANCE_ICON_CLASS = 'size-8 rounded-full bg-amber-500/15 p-1.5 text-amber-400'
const CURRENT_YEAR = new Date().getFullYear()

export default function ProfitTrackerDashboardPage() {
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const wallets = useProfitTrackerStore((s) => s.wallets)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const fetchWallets = useProfitTrackerStore((s) => s.fetchWallets)

  const [ledgerSummary, setLedgerSummary] = useState<BetLegRealizedLedgerSummaryResult | null>(null)
  const [isLoadingSummary, setIsLoadingSummary] = useState(true)
  const [puntateInCorsoValue, setPuntateInCorsoValue] = useState(0)

  useEffect(() => {
    void fetchAllAccounts()
    void fetchWallets()

    const fromDate = `${CURRENT_YEAR}-01-01T00:00:00Z`
    const toDate = `${CURRENT_YEAR}-12-31T23:59:59Z`

    Promise.all([
      getUnifiedProfitSummary({ granularity: 'month', fromDate, toDate }),
      getPuntateInCorsoTotale(),
    ])
      .then(([summary, puntate]) => {
        setLedgerSummary(summary)
        setPuntateInCorsoValue(puntate.totale)
      })
      .catch((err) => {
        console.error('Dashboard data fetch error:', err)
      })
      .finally(() => setIsLoadingSummary(false))
  }, [fetchAllAccounts, fetchWallets])

  const bilancio = useMemo(() => {
    const saldoBookmakers = allAccounts.reduce((sum, a) => sum + a.saldoAttuale, 0)
    const saldoWallets = wallets.reduce((sum, w) => sum + w.saldoAttuale, 0)
    // §14.109: i prelievi in attesa sono soldi usciti dal conto e non ancora nel wallet.
    const prelieviInAttesa = wallets.reduce((sum, w) => sum + (w.inAttesa ?? 0), 0)
    const saldoTotale = saldoBookmakers + saldoWallets + puntateInCorsoValue + prelieviInAttesa
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
      prelieviInAttesa,
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

  return (
    <ProfitTrackerPageShell
      sectionTitle="Dashboard"
      sectionDescription="Quadro sintetico di saldi e performance."
    >
      <div className="space-y-4">
        <h2 className="font-mono text-sm font-medium uppercase tracking-[0.02em] text-muted-foreground">
          Bilancio
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-start justify-between rounded-xl border border-border bg-card/70 p-4 shadow-sm">
            <div>
              <p className="font-mono text-xs font-medium uppercase tracking-[0.02em] text-muted-foreground">
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
              <p className="font-mono text-xs font-medium uppercase tracking-[0.02em] text-muted-foreground">
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
              <p className="font-mono text-xs font-medium uppercase tracking-[0.02em] text-muted-foreground">
                Prelievi in attesa
              </p>
              <p className="mt-2 font-mono text-2xl font-semibold text-amber-400">
                {formatCurrency(bilancio.prelieviInAttesa)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Usciti dai conti, non ancora nei wallet
              </p>
            </div>
            <div className={BALANCE_ICON_CLASS}>
              <Hourglass className="size-full" />
            </div>
          </div>
          <div className="flex items-start justify-between rounded-xl border border-border bg-card/70 p-4 shadow-sm">
            <div>
              <p className="font-mono text-xs font-medium uppercase tracking-[0.02em] text-muted-foreground">
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
              <p className="font-mono text-xs font-medium uppercase tracking-[0.02em] text-muted-foreground">
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
              <p className="font-mono text-xs font-medium uppercase tracking-[0.02em] text-muted-foreground">
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
          <p className="font-mono text-xs font-medium uppercase tracking-[0.02em] text-muted-foreground">
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
          <p className="font-mono text-xs font-medium uppercase tracking-[0.02em] text-muted-foreground">
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
          <p className="font-mono text-xs font-medium uppercase tracking-[0.02em] text-muted-foreground">
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

      <ProfitTrendChart
        year={CURRENT_YEAR}
        buckets={ledgerSummary?.buckets ?? []}
        isLoading={isLoadingSummary}
      />
    </ProfitTrackerPageShell>
  )
}
