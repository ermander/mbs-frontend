'use client'

import { useEffect, useMemo } from 'react'
import { Scale, Wallet, Loader2, Banknote } from 'lucide-react'

import { useProfitTrackerStore } from '@/stores/profit-tracker-store'

function formatCurrency(value: number): string {
  return value.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

const BALANCE_ICON_CLASS = 'size-8 rounded-full bg-amber-500/20 p-1.5 text-amber-600'

export default function ProfitTrackerDashboardPage() {
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const wallets = useProfitTrackerStore((s) => s.wallets)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const fetchWallets = useProfitTrackerStore((s) => s.fetchWallets)
  const ongoingBets = useProfitTrackerStore((s) => s.ongoingBets)
  const quickBets = useProfitTrackerStore((s) => s.quickBets)
  const accountMovements = useProfitTrackerStore((s) => s.accountMovements)
  const walletMovements = useProfitTrackerStore((s) => s.walletMovements)

  useEffect(() => {
    void fetchAllAccounts()
    void fetchWallets()
  }, [fetchAllAccounts, fetchWallets])

  const bilancio = useMemo(() => {
    const saldoBookmakers = allAccounts.reduce((sum, a) => sum + a.saldoAttuale, 0)
    const saldoWallets = wallets.reduce((sum, w) => sum + w.saldoAttuale, 0)
    const puntateInCorso = 0
    const saldoTotale = saldoBookmakers + saldoWallets + puntateInCorso
    return { saldoBookmakers, saldoWallets, puntateInCorso, saldoTotale }
  }, [allAccounts, wallets])

  const kpi = useMemo(() => {
    const totalQuick = quickBets.reduce((sum, q) => sum + q.movimento, 0)
    const totalAccount = accountMovements.reduce((sum, m) => sum + m.valore, 0)
    const totalWallet = walletMovements.reduce((sum, m) => sum + m.valore, 0)
    const totaleAnno = totalQuick + totalAccount + totalWallet

    const mediaMensile = totaleAnno / 12

    return {
      totaleAnno,
      mediaMensile,
      meseAttuale: totaleAnno / 6,
    }
  }, [accountMovements, quickBets, walletMovements])

  const fakeTrend = useMemo(() => [40, 80, 65, 120, 90, 140, 110, 160, 130, 170, 150, 180], [])

  const ultimeTransazioni = [...accountMovements, ...walletMovements]
    .sort((a, b) => (a.dataRegistrazione > b.dataRegistrazione ? -1 : 1))
    .slice(0, 5)

  return (
    <section className="space-y-8">
      <div>
        <h2 className="mb-4 text-xl font-bold text-foreground">Bilancio</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-start justify-between rounded-xl border border-border bg-card/70 p-4 shadow-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Saldo Bookmakers
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
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
              <p className="mt-2 text-2xl font-semibold text-foreground">
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
                Puntate in corso
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
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
              <p className="mt-2 text-2xl font-semibold text-foreground">
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
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatCurrency(kpi.meseAttuale)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Guadagno stimato del mese in corso.</p>
        </div>
        <div className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Media mensile
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatCurrency(kpi.mediaMensile)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Media mensile dei guadagni sull&apos;anno corrente.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Totale anno 2026
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatCurrency(kpi.totaleAnno)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Somma di tutte le movimentazioni registrate.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Trend guadagni 2026</p>
            <p className="text-xs text-muted-foreground">Mock basato sui dati correnti</p>
          </div>
          <div className="mt-2 h-40 rounded-md bg-muted/40 p-3">
            <div className="flex h-full items-end gap-1">
              {fakeTrend.map((value, index) => (
                <div key={index} className="flex-1">
                  <div
                    className="mx-auto w-3 rounded-full bg-primary/70"
                    style={{ height: `${20 + value}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
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

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
            <p className="text-sm font-medium text-foreground">Giocate in corso</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Riepilogo rapido delle giocate ancora aperte.
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {ongoingBets.slice(0, 3).map((bet) => (
                <li
                  key={bet.id}
                  className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2"
                >
                  <span className="truncate text-foreground">{bet.eventoNome}</span>
                  <span className="text-xs uppercase text-muted-foreground">{bet.sport}</span>
                </li>
              ))}
              {ongoingBets.length === 0 && (
                <li className="text-xs text-muted-foreground">
                  Nessuna giocata in corso registrata al momento.
                </li>
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
            <p className="text-sm font-medium text-foreground">Ultime transazioni</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Gli ultimi movimenti su conti e wallet.
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {ultimeTransazioni.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2"
                >
                  <span className="truncate text-foreground">
                    {new Date(t.dataRegistrazione).toLocaleDateString('it-IT')}
                  </span>
                  <span
                    className={
                      t.valore >= 0
                        ? 'text-xs font-medium text-emerald-600'
                        : 'text-xs font-medium text-red-500'
                    }
                  >
                    {formatCurrency(t.valore)}
                  </span>
                </li>
              ))}
              {ultimeTransazioni.length === 0 && (
                <li className="text-xs text-muted-foreground">
                  Non ci sono ancora movimenti registrati.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
