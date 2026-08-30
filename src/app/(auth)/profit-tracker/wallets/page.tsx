'use client'

import { useEffect, useMemo, useState } from 'react'

import { Wallet as WalletIcon, Lock, LockOpen } from 'lucide-react'
import { updateWallet as apiUpdateWallet } from '@/services/api/profit-tracker-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableMultiSelect } from '@/components/ui/searchable-multi-select'
import { ProfitTrackerPageShell } from '@/components/profit-tracker/profit-tracker-page-shell'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { WalletCreateModal } from '@/components/profit-tracker/wallet-create-modal'
import { WalletEditModal } from '@/components/profit-tracker/wallet-edit-modal'
import { WalletTransferModal } from '@/components/profit-tracker/wallet-transfer-modal'
import { WalletTopupExpenseModal } from '@/components/profit-tracker/wallet-topup-expense-modal'
import { useAuthStore } from '@/stores/auth-store'
import { StatusBadge } from '@/components/profit-tracker/status-badge'
import type { Wallet } from '@/types/profit-tracker'

const PER_PAGE = 20

function matchFilter(value: string | null | undefined, filter: string): boolean {
  const v = (value ?? '').toLowerCase().trim()
  const f = filter.toLowerCase().trim()
  return !f || v.includes(f)
}

export { WalletsPage as WalletsContent }
export default function WalletsPage() {
  const wallets = useProfitTrackerStore((s) => s.wallets)
  const holders = useProfitTrackerStore((s) => s.allHolders)
  const fetchHolders = useProfitTrackerStore((s) => s.fetchAllHolders)
  const fetchWallets = useProfitTrackerStore((s) => s.fetchWallets)
  const updateWallet = useProfitTrackerStore((s) => s.updateWallet)

  const userRole = useAuthStore((s) => s.user?.role)
  const isAdmin = userRole === 'ADMIN_ROLE'

  const toggleBloccato = async (id: string, current: boolean) => {
    try {
      const updated = await apiUpdateWallet(id, { bloccato: !current })
      updateWallet(id, { bloccato: updated.bloccato })
    } catch {
      // silently ignore — toggle non riuscito
    }
  }

  const renderBloccatoToggle = (id: string, current: boolean) => {
    if (!isAdmin) return current ? <StatusBadge variant="blocked">Bloccato</StatusBadge> : null
    return (
      <button
        type="button"
        title={
          current ? 'Wallet bloccato — clicca per sbloccare' : 'Clicca per segnare come bloccato'
        }
        aria-label={current ? 'Sblocca wallet' : 'Blocca wallet'}
        onClick={() => void toggleBloccato(id, current)}
        className={
          'inline-flex h-6 items-center gap-1 rounded-pill border px-2 text-[11px] font-medium transition-colors ' +
          (current
            ? 'border-amber-500/30 bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'
            : 'border-white/10 bg-white/5 text-white/40 hover:border-white/20 hover:text-white/60')
        }
      >
        {current ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
        {current ? 'Bloccato' : 'Libero'}
      </button>
    )
  }

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [topupOpen, setTopupOpen] = useState(false)

  const [holderIds, setHolderIds] = useState<string[]>([])
  const [walletNameFilter, setWalletNameFilter] = useState('')
  const [descrizioneFilter, setDescrizioneFilter] = useState('')
  const [filterStato, setFilterStato] = useState('')
  const [filterBloccato, setFilterBloccato] = useState<'' | 'solo' | 'no'>('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)

  const resolveHolderName = (holderId: string) =>
    holders.find((h) => h.id === holderId)?.nome ?? '—'

  const { visible, total, maxPage } = useMemo(() => {
    const filteredList = wallets.filter((wallet) => {
      if (holderIds.length > 0 && !holderIds.includes(wallet.holderId)) return false
      if (filterStato && wallet.stato !== filterStato) return false
      if (filterBloccato === 'solo' && !wallet.bloccato) return false
      if (filterBloccato === 'no' && wallet.bloccato) return false
      return (
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
    return {
      visible: visibleList,
      total: totalCount,
      maxPage: maxPageNum,
    }
  }, [
    wallets,
    holderIds,
    walletNameFilter,
    descrizioneFilter,
    filterStato,
    filterBloccato,
    sortOrder,
    page,
  ])

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
    <ProfitTrackerPageShell
      sectionTitle="Wallets"
      sectionDescription="Configura e monitora i metodi di pagamento e la liquidità disponibile."
      actions={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <Button
            variant="outline"
            type="button"
            onClick={() => setTransferOpen(true)}
            className="w-full sm:w-auto"
          >
            Trasferisci
          </Button>
          <Button
            variant="outline"
            type="button"
            onClick={() => setTopupOpen(true)}
            className="w-full sm:w-auto"
          >
            Ricarica/Spesa
          </Button>
          <Button type="button" onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
            Nuovo wallet
          </Button>
        </div>
      }
    >
      <div
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-2.5 sm:w-fit sm:justify-start"
        role="status"
        aria-label={`Saldo totale wallets: ${saldoTotaleFormatted}`}
      >
        <WalletIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="text-sm text-muted-foreground">Saldo attuale</span>
        <span className="text-base font-semibold tabular-nums text-foreground">
          {saldoTotaleFormatted}
        </span>
      </div>

      <div className="flex flex-col items-stretch gap-4 rounded-xl border border-border bg-card/70 p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
        <SearchableMultiSelect
          label="Intestatario"
          placeholder="Tutti"
          searchPlaceholder="Cerca intestatario..."
          buttonLabel={holderIds.length > 0 ? `${holderIds.length} selezionati` : 'Tutti'}
          options={holders.map((h) => ({ id: h.id, name: h.nome }))}
          selectedIds={holderIds}
          onToggle={(id) => {
            setHolderIds((prev) =>
              prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
            )
            setPage(1)
          }}
          showBadges
          className="w-full sm:min-w-[200px]"
        />
        <div className="space-y-1.5 sm:min-w-[200px]">
          <Label htmlFor="filter-wallet-name" className="text-xs">
            Nome wallet
          </Label>
          <Input
            id="filter-wallet-name"
            type="text"
            placeholder="Cerca per nome..."
            value={walletNameFilter}
            onChange={(e) => onWalletNameFilterChange(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5 sm:min-w-[200px]">
          <Label htmlFor="filter-descrizione" className="text-xs">
            Descrizione
          </Label>
          <Input
            id="filter-descrizione"
            type="text"
            placeholder="Cerca per descrizione..."
            value={descrizioneFilter}
            onChange={(e) => onDescrizioneFilterChange(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5 sm:min-w-[160px]">
          <Label htmlFor="filter-stato-wallet" className="text-xs">
            Stato
          </Label>
          <select
            id="filter-stato-wallet"
            value={filterStato}
            onChange={(e) => {
              setFilterStato(e.target.value)
              setPage(1)
            }}
            className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">Tutti</option>
            <option value="abilitato">Abilitato</option>
            <option value="disabilitato">Non abilitato</option>
          </select>
        </div>
        <div className="space-y-1.5 sm:min-w-[160px]">
          <Label htmlFor="filter-bloccato-wallet" className="text-xs">
            Bloccato
          </Label>
          <select
            id="filter-bloccato-wallet"
            value={filterBloccato}
            onChange={(e) => {
              setFilterBloccato(e.target.value as '' | 'solo' | 'no')
              setPage(1)
            }}
            className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">Tutti</option>
            <option value="solo">Solo bloccati</option>
            <option value="no">Non bloccati</option>
          </select>
        </div>
      </div>

      <div className="block space-y-4 sm:hidden">
        {visible.map((wallet) => (
          <div key={wallet.id} className="rounded-xl border border-border bg-card/70 p-4 shadow-sm">
            <div className="grid gap-2 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Intestatario</span>
                <span className="text-right text-foreground">
                  {resolveHolderName(wallet.holderId)}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Nome</span>
                <span className="text-right text-foreground">{wallet.nome}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Descrizione</span>
                <span className="text-right text-muted-foreground">
                  {wallet.descrizione ?? '—'}
                </span>
              </div>
              <div className="flex justify-between gap-2 border-t border-border/50 pt-2">
                <span className="text-muted-foreground">Saldo attuale</span>
                <span className="font-mono font-medium text-foreground">
                  {wallet.saldoAttuale.toFixed(2)} €
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Stato</span>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
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
                  {renderBloccatoToggle(wallet.id, wallet.bloccato === true)}
                </div>
              </div>
            </div>
            <div className="mt-4 border-t border-border/60 pt-3">
              <button
                type="button"
                className="w-full rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                onClick={() => {
                  setSelectedWallet(wallet)
                  setEditOpen(true)
                }}
              >
                Modifica
              </button>
            </div>
          </div>
        ))}
        {wallets.length === 0 && (
          <div className="rounded-xl border border-border bg-card/70 p-6 text-center text-sm text-muted-foreground shadow-sm">
            Nessun wallet registrato. Usa &quot;Nuovo wallet&quot; per crearne uno.
          </div>
        )}
        {wallets.length > 0 && visible.length === 0 && (
          <div className="rounded-xl border border-border bg-card/70 p-6 text-center text-sm text-muted-foreground shadow-sm">
            Nessun wallet corrisponde ai filtri.
          </div>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card/70 shadow-sm sm:block">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 text-xs font-medium uppercase tracking-wider text-muted-foreground">
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
              <tr
                key={wallet.id}
                className="border-b border-border/40 transition-colors last:border-b-0 hover:bg-accent"
              >
                <td className="px-3 py-2 text-xs text-foreground">
                  {resolveHolderName(wallet.holderId)}
                </td>
                <td className="px-3 py-2 text-sm text-foreground">{wallet.nome}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {wallet.descrizione ?? '—'}
                </td>
                <td className="px-3 py-2 font-mono text-xs font-medium text-foreground">
                  {wallet.saldoAttuale.toFixed(2)} €
                </td>
                <td className="px-3 py-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
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
                    {renderBloccatoToggle(wallet.id, wallet.bloccato === true)}
                  </div>
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

      {total > PER_PAGE && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card/70 px-3 py-2 shadow-sm">
          <p className="text-xs text-muted-foreground">
            Pagina {safePage} di {maxPage} &middot; {total} wallet in totale
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
            >
              Precedente
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
              disabled={safePage >= maxPage}
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
      <WalletTransferModal
        open={transferOpen}
        onOpenChange={(open) => {
          setTransferOpen(open)
          if (!open) void fetchWallets()
        }}
      />
      <WalletTopupExpenseModal
        open={topupOpen}
        onOpenChange={(open) => {
          setTopupOpen(open)
          if (!open) void fetchWallets()
        }}
      />
    </ProfitTrackerPageShell>
  )
}
