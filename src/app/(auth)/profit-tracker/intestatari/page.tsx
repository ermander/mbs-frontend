'use client'

import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ProfitTrackerPageShell } from '@/components/profit-tracker/profit-tracker-page-shell'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { HolderCreateModal, HolderEditModal } from '@/components/profit-tracker/holder-modals'
import { AccountCreateModal } from '@/components/profit-tracker/account-create-modal'
import { WalletCreateModal } from '@/components/profit-tracker/wallet-create-modal'

const PAGE_SIZE = 20

export { IntestatariPage as IntestatariContent }
export default function IntestatariPage() {
  const holders = useProfitTrackerStore((s) => s.holders)
  const holdersTotal = useProfitTrackerStore((s) => s.holdersTotal) ?? 0
  const isLoadingHolders = useProfitTrackerStore((s) => s.isLoadingHolders)
  const holdersError = useProfitTrackerStore((s) => s.holdersError)
  const fetchHolders = useProfitTrackerStore((s) => s.fetchHolders)

  const [createOpen, setCreateOpen] = useState(false)
  const [editHolderId, setEditHolderId] = useState<string | null>(null)
  const [newAccountHolderId, setNewAccountHolderId] = useState<string | null>(null)
  const [newWalletHolderId, setNewWalletHolderId] = useState<string | null>(null)

  const [filterNome, setFilterNome] = useState('')
  const [filterDescrizione, setFilterDescrizione] = useState('')
  const [filterStato, setFilterStato] = useState('')
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(holdersTotal / PAGE_SIZE))

  const currentEditHolder = holders.find((h) => h.id === editHolderId) ?? null

  const fetchPage = useCallback(
    (p: number) => {
      fetchHolders({
        page: p,
        limit: PAGE_SIZE,
        nome: filterNome.trim() || undefined,
        descrizione: filterDescrizione.trim() || undefined,
        stato: filterStato || undefined,
      }).catch(() => {})
    },
    [fetchHolders, filterNome, filterDescrizione, filterStato],
  )

  useEffect(() => {
    fetchPage(1)
  }, [fetchPage])

  const goToPage = (p: number) => {
    const next = Math.max(1, Math.min(p, totalPages))
    if (next === page) return
    setPage(next)
    fetchPage(next)
  }

  return (
    <ProfitTrackerPageShell
      sectionTitle="Intestatari"
      sectionDescription="Gestisci gli intestatari collegati a conti e wallet."
      actions={
        <Button type="button" onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
          Nuovo intestatario
        </Button>
      }
    >
      {/* Filters */}
      <div className="flex flex-col items-stretch gap-4 rounded-xl border border-border bg-card/70 p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-1.5 sm:min-w-[200px]">
          <Label htmlFor="filter-nome" className="text-xs">
            Nome
          </Label>
          <Input
            id="filter-nome"
            type="text"
            placeholder="Cerca per nome..."
            value={filterNome}
            onChange={(e) => {
              setFilterNome(e.target.value)
              setPage(1)
            }}
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
            value={filterDescrizione}
            onChange={(e) => {
              setFilterDescrizione(e.target.value)
              setPage(1)
            }}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5 sm:min-w-[160px]">
          <Label htmlFor="filter-stato" className="text-xs">
            Stato
          </Label>
          <select
            id="filter-stato"
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
      </div>

      {/* Mobile cards */}
      <div className="block space-y-4 sm:hidden">
        {isLoadingHolders && (
          <div className="rounded-xl border border-border bg-card/70 p-6 text-center text-sm text-muted-foreground shadow-sm">
            Caricamento intestatari in corso...
          </div>
        )}
        {!isLoadingHolders &&
          holders.map((holder) => (
            <div
              key={holder.id}
              className="rounded-xl border border-border bg-card/70 p-4 shadow-sm"
            >
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Nome</span>
                  <span className="text-right text-foreground">{holder.nome}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Descrizione</span>
                  <span className="text-right text-muted-foreground">
                    {holder.descrizione ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Stato</span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      holder.stato === 'abilitato'
                        ? 'border border-emerald-500/20 bg-emerald-500/15 text-emerald-400'
                        : 'border border-white/10 bg-white/5 text-white/40'
                    }`}
                  >
                    {holder.stato === 'abilitato' ? 'Abilitato' : 'Non abilitato'}
                  </span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/60 pt-3">
                <button
                  type="button"
                  className="rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                  onClick={() => setNewWalletHolderId(holder.id)}
                >
                  Nuovo wallet
                </button>
                <button
                  type="button"
                  className="rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                  onClick={() => setNewAccountHolderId(holder.id)}
                >
                  Nuovo conto
                </button>
                <button
                  type="button"
                  className="rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                  onClick={() => setEditHolderId(holder.id)}
                >
                  Modifica
                </button>
              </div>
            </div>
          ))}
        {!isLoadingHolders && holders.length === 0 && (
          <div className="rounded-xl border border-border bg-card/70 p-6 text-center text-sm text-muted-foreground shadow-sm">
            Nessun intestatario registrato. Usa &quot;Nuovo intestatario&quot; per aggiungerne uno.
          </div>
        )}
        {holdersError && !isLoadingHolders && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-center text-xs text-destructive">
            {holdersError}
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card/70 shadow-sm sm:block">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2 text-left">Nome</th>
              <th className="px-3 py-2 text-left">Descrizione</th>
              <th className="px-3 py-2 text-left">Stato</th>
              <th className="px-3 py-2 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {isLoadingHolders && (
              <tr>
                <td className="px-3 py-6 text-center text-xs text-muted-foreground" colSpan={4}>
                  Caricamento intestatari in corso...
                </td>
              </tr>
            )}
            {!isLoadingHolders &&
              holders.map((holder) => (
                <tr
                  key={holder.id}
                  className="border-b border-border/40 transition-colors last:border-b-0 hover:bg-accent"
                >
                  <td className="px-3 py-2 text-sm text-foreground">{holder.nome}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {holder.descrizione ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        holder.stato === 'abilitato'
                          ? 'border border-emerald-500/20 bg-emerald-500/15 text-emerald-400'
                          : 'border border-white/10 bg-white/5 text-white/40'
                      }`}
                    >
                      {holder.stato === 'abilitato' ? 'Abilitato' : 'Non abilitato'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                        onClick={() => setNewWalletHolderId(holder.id)}
                      >
                        Nuovo wallet
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                        onClick={() => setNewAccountHolderId(holder.id)}
                      >
                        Nuovo conto
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                        onClick={() => setEditHolderId(holder.id)}
                      >
                        Modifica
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            {!isLoadingHolders && holders.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-xs text-muted-foreground" colSpan={4}>
                  Nessun intestatario registrato. Usa &quot;Nuovo intestatario&quot; per aggiungerne
                  uno.
                </td>
              </tr>
            )}
            {holdersError && !isLoadingHolders && (
              <tr>
                <td className="px-3 py-3 text-center text-xs text-destructive" colSpan={4}>
                  {holdersError}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {holdersTotal > PAGE_SIZE && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card/70 px-3 py-2 shadow-sm">
          <p className="text-xs text-muted-foreground">
            Pagina {page} di {totalPages} &middot; {holdersTotal} intestatari in totale
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoadingHolders}
              onClick={() => goToPage(page - 1)}
            >
              Precedente
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isLoadingHolders}
              onClick={() => goToPage(page + 1)}
            >
              Successiva
            </Button>
          </div>
        </div>
      )}

      <HolderCreateModal open={createOpen} onOpenChange={setCreateOpen} />
      <HolderEditModal
        open={editHolderId != null}
        onOpenChange={(open) => {
          if (!open) setEditHolderId(null)
        }}
        holder={currentEditHolder}
      />
      <AccountCreateModal
        open={newAccountHolderId != null}
        onOpenChange={(open) => {
          if (!open) setNewAccountHolderId(null)
        }}
      />
      <WalletCreateModal
        open={newWalletHolderId != null}
        onOpenChange={(open) => {
          if (!open) setNewWalletHolderId(null)
        }}
        defaultHolderId={newWalletHolderId ?? undefined}
      />
    </ProfitTrackerPageShell>
  )
}
