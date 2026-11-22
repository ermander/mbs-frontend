'use client'

import { useEffect, useMemo, useState } from 'react'
import { Clock, Euro, Lock, RefreshCw, Scale, Wallet } from 'lucide-react'

import { DsSection, DsStatTile } from '@/components/profit-tracker/tracker-ds'
import { dashboardBalances } from '@/lib/profit-tracker/dashboard'
import { getPuntateInCorsoTotale } from '@/services/api/profit-tracker-client'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'

/**
 * I sei saldi su righe piene: 2 + 2 + 2 sul tablet, 3 + 3 sul portatile, tutti e sei in fila dai
 * 1800px. Con la pagina a tutta larghezza (§14.357) la griglia a riempimento dava 5 + 1 tra 1600 e
 * 1900px.
 */
const SALDI_GRID = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 min-[112.5rem]:grid-cols-6'

/**
 * I saldi di oggi, in testa al Report: prima stavano nella Dashboard, che ora fa da pagina delle
 * scorciatoie. Non seguono i filtri del Report (anno, identità, conto, categoria): sono la
 * fotografia di adesso di conti, wallet, prelievi e puntate in corso.
 */
export function ReportSaldi() {
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const wallets = useProfitTrackerStore((s) => s.wallets)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const fetchWallets = useProfitTrackerStore((s) => s.fetchWallets)
  const [puntateInCorso, setPuntateInCorso] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    void fetchAllAccounts()
    void fetchWallets()
    getPuntateInCorsoTotale()
      .then((p) => setPuntateInCorso(p.totale))
      .catch((err) => console.error('Report saldi fetch error:', err))
      .finally(() => setIsLoading(false))
  }, [fetchAllAccounts, fetchWallets])

  const saldi = useMemo(
    () => dashboardBalances(allAccounts, wallets, puntateInCorso),
    [allAccounts, wallets, puntateInCorso],
  )

  return (
    <DsSection id="h-report-saldi" title="Saldi di oggi">
      <div className={SALDI_GRID}>
        <DsStatTile
          label="Saldo totale"
          value={saldi.saldoTotale}
          note="Bookmaker, wallet, prelievi in attesa e puntate in corso"
          icon={Euro}
          isLoading={isLoading}
        />
        <DsStatTile
          label="Saldo bookmaker"
          value={saldi.saldoBookmakers}
          note={saldi.bookNote}
          icon={Scale}
        />
        <DsStatTile
          label="Saldo wallet"
          value={saldi.saldoWallets}
          note={saldi.walletNote}
          icon={Wallet}
        />
        <DsStatTile
          label="Prelievi in attesa"
          value={saldi.prelieviInAttesa}
          note="Usciti dai conti, non ancora sui wallet"
          icon={Clock}
        />
        <DsStatTile
          label="Saldo bloccato"
          value={saldi.saldoBloccato}
          note={saldi.bloccatoNote}
          icon={Lock}
        />
        <DsStatTile
          label="Puntate in corso"
          value={saldi.puntateInCorso}
          note="Importi ancora sulle giocate aperte"
          icon={RefreshCw}
          isLoading={isLoading}
        />
      </div>
    </DsSection>
  )
}
