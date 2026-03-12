'use client'

import { useEffect, useMemo, useState } from 'react'

import { Wallet as WalletIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { WalletCreateModal } from '@/components/profit-tracker/wallet-create-modal'
import { WalletEditModal } from '@/components/profit-tracker/wallet-edit-modal'
import { WalletTransferModal } from '@/components/profit-tracker/wallet-transfer-modal'
import { WalletTopupExpenseModal } from '@/components/profit-tracker/wallet-topup-expense-modal'
import { StatusBadge } from '@/components/profit-tracker/status-badge'
import type { Wallet } from '@/types/profit-tracker'

const PER_PAGE = 20

function matchFilter(value: string | null | undefined, filter: string): boolean {
  const v = (value ?? '').toLowerCase().trim()
  const f = filter.toLowerCase().trim()
  return !f || v.includes(f)
}

export default function WalletsPage() {
  const wallets = useProfitTrackerStore((s) => s.wallets)
  const holders = useProfitTrackerStore((s) => s.holders)
  const fetchHolders = useProfitTrackerStore((s) => s.fetchHolders)
  const fetchWallets = useProfitTrackerStore((s) => s.fetchWallets)
  const updateWallet = useProfitTrackerStore((s) => s.updateWallet)

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [topupOpen, setTopupOpen] = useState(false)

  const [holderFilter, setHolderFilter] = useState('')
  const [walletNameFilter, setWalletNameFilter] = useState('')
  const [descrizioneFilter, setDescrizioneFilter] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)

  const resolveHolderName = (holderId: string) =>
    holders.find((h) => h.id === holderId)?.nome ?? '—'

  const { visible, total, start, end, maxPage } = useMemo(() => {
    const resolveName = (holderId: string) => holders.find((h) => h.id === holderId)?.nome ?? '—'
    const filteredList = wallets.filter((wallet) => {
      const holderName = resolveName(wallet.holderId)
      return (
        matchFilter(holderName, holderFilter) &&
        matchFilter(wallet.nome, walletNameFilter) &&
        matchFilter(wallet.descrizione, descrizioneFilter)
      )
    })
    const sortedList = [...filteredList].sort((a, b) =>
      sortOrder === 'desc' ? b.saldoAttuale - a.saldoAttuale : a.saldoAttuale - b.saldoAttuale,
    )
    const totalCount = sortedList.length
    const maxPageNum = Math.max(1, Math.ceil(totalCount / PER_PAGE))
    const safePage = Math.min(Math.max(1, page), maxPageNum)
    const startIdx = (safePage - 1) * PER_PAGE
    const visibleList = sortedList.slice(startIdx, startIdx + PER_PAGE)
    const startNum = totalCount === 0 ? 0 : startIdx + 1
    const endNum = totalCount === 0 ? 0 : Math.min(startIdx + PER_PAGE, totalCount)
    return {
      visible: visibleList,
      total: totalCount,
      start: startNum,
      end: endNum,
      maxPage: maxPageNum,
    }
  }, [wallets, holders, holderFilter, walletNameFilter, descrizioneFilter, sortOrder, page])

  const onHolderFilterChange = (value: string) => {
    setHolderFilter(value)
    setPage(1)
  }
  const onWalletNameFilterChange = (value: string) => {
    setWalletNameFilter(value)
    setPage(1)
  }
  const onDescrizioneFilterChange = (value: string) => {
    setDescrizioneFilter(value)
    setPage(1)
  }

  useEffect(() => {
    void fetchHolders()
    void fetchWallets()
  }, [fetchHolders, fetchWallets])

  const safePage = Math.min(Math.max(1, page), maxPage)

  const saldoTotale = wallets.reduce((sum, w) => sum + w.saldoAttuale, 0)
  const saldoTotaleFormatted =
    saldoTotale.toLocaleString('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' €'

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Wallets</h1>
          <p className="text-muted-foreground">
            Configura e monitora i tuoi metodi di pagamento e i relativi saldi.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" type="button" onClick={() => setTransferOpen(true)}>
            Trasferisci
          </Button>
          <Button variant="outline" type="button" onClick={() => setTopupOpen(true)}>
            Ricarica/Spesa
          </Button>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            Nuovo wallet
          </Button>
        </div>
      </header>

      <div
        className="flex w-fit items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-2.5"
        role="status"
        aria-label={`Saldo totale wallets: ${saldoTotaleFormatted}`}
      >
        <WalletIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="text-sm text-muted-foreground">Saldo attuale</span>
        <span className="text-base font-semibold tabular-nums text-foreground">
          {saldoTotaleFormatted}
        </span>
      </div>

      <div className="grid gap-2 rounded-xl border border-border bg-card/70 p-3 shadow-sm sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="filter-holder" className="text-xs">
            Filtra intestatario
          </Label>
          <Input
            id="filter-holder"
            type="text"
            placeholder="Filtra intestatario"
            value={holderFilter}
            onChange={(e) => onHolderFilterChange(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filter-wallet-name" className="text-xs">
            Nome wallet
          </Label>
          <Input
            id="filter-wallet-name"
            type="text"
            placeholder="Nome wallet"
            value={walletNameFilter}
            onChange={(e) => onWalletNameFilterChange(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filter-descrizione" className="text-xs">
            Descrizione
          </Label>
          <Input
            id="filter-descrizione"
            type="text"
            placeholder="Descrizione"
            value={descrizioneFilter}
            onChange={(e) => onDescrizioneFilterChange(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card/70 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 text-xs font-medium text-muted-foreground">
              <th className="px-3 py-2 text-left">Intestatario</th>
              <th className="px-3 py-2 text-left">Nome</th>
              <th className="px-3 py-2 text-left">Descrizione</th>
              <th className="px-3 py-2 text-left">
                <button
                  type="button"
                  onClick={() => setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
                  className="inline-flex items-center gap-1 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label={
                    sortOrder === 'desc'
                      ? 'Ordina per saldo decrescente (clicca per crescente)'
                      : 'Ordina per saldo crescente (clicca per decrescente)'
                  }
                >
                  Saldo attuale
                  <span className="text-muted-foreground" aria-hidden>
                    {sortOrder === 'desc' ? ' ↓' : ' ↑'}
                  </span>
                </button>
              </th>
              <th className="px-3 py-2 text-left">Stato</th>
              <th className="px-3 py-2 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((wallet) => (
              <tr key={wallet.id} className="border-b border-border/40 last:border-b-0">
                <td className="px-3 py-2 text-xs text-foreground">
                  {resolveHolderName(wallet.holderId)}
                </td>
                <td className="px-3 py-2 text-sm text-foreground">{wallet.nome}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {wallet.descrizione ?? '—'}
                </td>
                <td className="px-3 py-2 text-xs font-medium text-foreground">
                  {wallet.saldoAttuale.toFixed(2)} €
                </td>
                <td className="px-3 py-2 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      updateWallet(wallet.id, {
                        stato: wallet.stato === 'abilitato' ? 'disabilitato' : 'abilitato',
                      })
                    }
                  >
                    <StatusBadge variant={wallet.stato === 'abilitato' ? 'enabled' : 'disabled'}>
                      {wallet.stato === 'abilitato' ? 'Abilitato' : 'Non abilitato'}
                    </StatusBadge>
                  </button>
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                      onClick={() => {
                        setSelectedWallet(wallet)
                        setEditOpen(true)
                      }}
                    >
                      Modifica
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {wallets.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-xs text-muted-foreground" colSpan={6}>
                  Nessun wallet registrato. Usa &quot;Nuovo wallet&quot; per crearne uno.
                </td>
              </tr>
            )}
            {wallets.length > 0 && visible.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-xs text-muted-foreground" colSpan={6}>
                  Nessun wallet corrisponde ai filtri.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/70 px-3 py-2 shadow-sm">
          <p className="text-xs text-muted-foreground">
            Visualizzo{' '}
            <strong>
              {start}-{end}
            </strong>{' '}
            di <strong>{total}</strong> elementi.
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              aria-disabled={safePage <= 1}
            >
              Precedente
            </Button>
            <span className="text-xs text-muted-foreground">
              Pagina {safePage} di {maxPage}
            </span>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
              disabled={safePage >= maxPage}
              aria-disabled={safePage >= maxPage}
            >
              Successiva
            </Button>
          </div>
        </div>
      )}

      <WalletCreateModal open={createOpen} onOpenChange={setCreateOpen} />
      <WalletEditModal
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) setSelectedWallet(null)
        }}
        wallet={selectedWallet}
      />
      <WalletTransferModal open={transferOpen} onOpenChange={setTransferOpen} />
      <WalletTopupExpenseModal open={topupOpen} onOpenChange={setTopupOpen} />
    </section>
  )
}
