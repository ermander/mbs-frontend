'use client'

import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Search, Users, X } from 'lucide-react'

import { dsButtonClass } from '@/components/landing/ds-primitives'
import { DsBadge } from '@/components/landing/ds-data'
import { OmPagination } from '@/components/strumenti/scanner-v2/om-ds'
import {
  GIconButton,
  GSelect,
  GTextField,
} from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { AccountCreateModal } from '@/components/profit-tracker/account-create-modal'
import { HolderCreateModal, HolderEditModal } from '@/components/profit-tracker/holder-modals'
import { WalletCreateModal } from '@/components/profit-tracker/wallet-create-modal'
import {
  DS_CARD,
  DS_PANEL,
  DS_ROW,
  DS_TABLE_WRAP,
  DS_THEAD_ROW,
  DsAlert,
  DsEmptyState,
  DsPageHeader,
  countLabel,
} from '@/components/profit-tracker/tracker-ds'
import { cn } from '@/lib/utils'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { Holder } from '@/types/profit-tracker'

/**
 * I collaboratori del tracker sul design OddWise (§14.350), scheda «Collaboratori» di Gestione
 * conti: filtri per nome, descrizione e stato, tabella (schede sul telefono) con Nuovo conto e
 * Nuovo wallet già intestati al collaboratore della riga, e Modifica. Pagine e filtri li fa il
 * backend come prima.
 */

const PAGE_SIZE = 20

const STATO_FILTER = [
  { value: '', label: 'Tutti gli stati' },
  { value: 'abilitato', label: 'Abilitati' },
  { value: 'disabilitato', label: 'Non abilitati' },
]

export function CollaboratoriView() {
  const holders = useProfitTrackerStore((s) => s.holders)
  const holdersTotal = useProfitTrackerStore((s) => s.holdersTotal) ?? 0
  const isLoading = useProfitTrackerStore((s) => s.isLoadingHolders)
  const holdersError = useProfitTrackerStore((s) => s.holdersError)
  const fetchHolders = useProfitTrackerStore((s) => s.fetchHolders)
  const fetchAllHolders = useProfitTrackerStore((s) => s.fetchAllHolders)

  const [createOpen, setCreateOpen] = useState(false)
  const [editHolderId, setEditHolderId] = useState<string | null>(null)
  const [newAccountHolderId, setNewAccountHolderId] = useState<string | null>(null)
  const [newWalletHolderId, setNewWalletHolderId] = useState<string | null>(null)

  const [filterNome, setFilterNome] = useState('')
  const [filterDescrizione, setFilterDescrizione] = useState('')
  const [filterStato, setFilterStato] = useState('')
  /** Da 0, come la paginazione del design; il backend conta da 1. */
  const [page, setPage] = useState(0)

  const load = useCallback(() => {
    void fetchHolders({
      page: page + 1,
      limit: PAGE_SIZE,
      nome: filterNome.trim() || undefined,
      descrizione: filterDescrizione.trim() || undefined,
      stato: filterStato || undefined,
    })
  }, [fetchHolders, page, filterNome, filterDescrizione, filterStato])

  useEffect(() => {
    load()
  }, [load])

  // Le modali Nuovo conto e Nuovo wallet della riga scelgono il collaboratore dall'elenco completo.
  useEffect(() => {
    void fetchAllHolders()
  }, [fetchAllHolders])

  const editing = holders.find((h) => h.id === editHolderId) ?? null

  const active: { key: string; label: string; clear: () => void }[] = []
  if (filterNome.trim())
    active.push({ key: 'nome', label: `«${filterNome.trim()}»`, clear: () => setFilterNome('') })
  if (filterDescrizione.trim())
    active.push({
      key: 'descrizione',
      label: `Descrizione «${filterDescrizione.trim()}»`,
      clear: () => setFilterDescrizione(''),
    })
  if (filterStato)
    active.push({
      key: 'stato',
      label: filterStato === 'abilitato' ? 'Abilitati' : 'Non abilitati',
      clear: () => setFilterStato(''),
    })
  const filtered = active.length > 0

  const resetFilters = () => {
    setFilterNome('')
    setFilterDescrizione('')
    setFilterStato('')
    setPage(0)
  }

  const isEmpty = !isLoading && !holdersError && holders.length === 0

  /* ---------- Pezzi delle righe ---------- */

  const statoBadge = (h: Holder) => (
    <DsBadge tone={h.stato === 'abilitato' ? 'profit' : 'neutral'}>
      {h.stato === 'abilitato' ? 'Abilitato' : 'Non abilitato'}
    </DsBadge>
  )

  const descrizione = (h: Holder) =>
    h.descrizione ? (
      <span title={h.descrizione} className="ds-body-sm block truncate text-ds-ink-muted">
        {h.descrizione}
      </span>
    ) : (
      <span className="text-ds-ink-faint">—</span>
    )

  const actions = (h: Holder) => (
    <div className="flex flex-wrap items-center justify-end gap-0.5">
      <button
        type="button"
        onClick={() => setNewAccountHolderId(h.id)}
        className={cn(dsButtonClass('ghost', 'sm'), 'px-2')}
      >
        <Plus className="h-4 w-4" aria-hidden />
        Conto
        <span className="sr-only"> per {h.nome}</span>
      </button>
      <button
        type="button"
        onClick={() => setNewWalletHolderId(h.id)}
        className={cn(dsButtonClass('ghost', 'sm'), 'px-2')}
      >
        <Plus className="h-4 w-4" aria-hidden />
        Wallet
        <span className="sr-only"> per {h.nome}</span>
      </button>
      <GIconButton label={`Modifica ${h.nome}`} onClick={() => setEditHolderId(h.id)}>
        <Pencil className="h-4 w-4" aria-hidden />
      </GIconButton>
    </div>
  )

  return (
    <>
      <DsPageHeader
        title="Collaboratori"
        description="Le persone a cui sono intestati conti e wallet."
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className={dsButtonClass('primary', 'md')}
          >
            <Plus className="h-5 w-5" aria-hidden />
            Nuovo collaboratore
          </button>
        }
      />

      <div
        className={cn(DS_PANEL, 'grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2 lg:grid-cols-3')}
      >
        <GTextField
          id="collaboratori-filtro-nome"
          label="Nome"
          type="search"
          size="sm"
          placeholder="Cerca per nome"
          value={filterNome}
          onChange={(v) => {
            setFilterNome(v)
            setPage(0)
          }}
        />
        <GTextField
          id="collaboratori-filtro-descrizione"
          label="Descrizione"
          type="search"
          size="sm"
          placeholder="Cerca nella descrizione"
          value={filterDescrizione}
          onChange={(v) => {
            setFilterDescrizione(v)
            setPage(0)
          }}
        />
        <GSelect
          id="collaboratori-filtro-stato"
          label="Stato"
          size="sm"
          options={STATO_FILTER}
          value={filterStato}
          onChange={(v) => {
            setFilterStato(v)
            setPage(0)
          }}
        />
      </div>

      <div className="flex min-h-8 flex-wrap items-center gap-2">
        {filtered ? (
          <>
            <span className="ds-label text-ds-ink-muted uppercase">Filtri attivi</span>
            {active.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-label={`Togli il filtro ${f.label}`}
                onClick={() => {
                  f.clear()
                  setPage(0)
                }}
                className={dsButtonClass('ghost', 'sm')}
              >
                {f.label}
                <X className="h-4 w-4" aria-hidden />
              </button>
            ))}
            <button type="button" onClick={resetFilters} className={dsButtonClass('ghost', 'sm')}>
              Azzera
            </button>
          </>
        ) : (
          <span className="ds-body-sm text-ds-ink-muted">
            {!isLoading || holders.length > 0
              ? countLabel(holdersTotal, 'collaboratore', 'collaboratori')
              : ''}
          </span>
        )}
      </div>

      {holdersError && <DsAlert>{holdersError}</DsAlert>}

      {isLoading && holders.length === 0 && (
        <p className="ds-body-sm m-0 text-ds-ink-muted">Caricamento dei collaboratori…</p>
      )}
      {isEmpty && !filtered && (
        <DsEmptyState
          icon={<Users className="h-8 w-8" strokeWidth={1.75} aria-hidden />}
          title="Nessun collaboratore registrato"
          description="Aggiungi la prima persona a cui intestare conti e wallet."
          action={
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className={dsButtonClass('primary', 'md')}
            >
              <Plus className="h-5 w-5" aria-hidden />
              Nuovo collaboratore
            </button>
          }
        />
      )}
      {isEmpty && filtered && (
        <DsEmptyState
          icon={<Search className="h-8 w-8" strokeWidth={1.75} aria-hidden />}
          title="Nessun collaboratore con questi filtri"
          description="Togli un filtro o cerca un altro nome."
          action={
            <button
              type="button"
              onClick={resetFilters}
              className={dsButtonClass('secondary', 'md')}
            >
              Azzera i filtri
            </button>
          }
        />
      )}

      {holders.length > 0 && (
        <div className={cn('flex flex-col gap-3', isLoading && 'opacity-60')}>
          <div className={DS_TABLE_WRAP}>
            <table className="w-full border-collapse">
              <caption className="sr-only">Collaboratori</caption>
              <thead>
                <tr className={DS_THEAD_ROW}>
                  <th scope="col" className="w-[220px] py-3 pr-2.5 pl-4">
                    Nome
                  </th>
                  <th scope="col" className="min-w-[180px] px-2.5 py-3">
                    Descrizione
                  </th>
                  <th scope="col" className="w-[140px] px-2.5 py-3">
                    Stato
                  </th>
                  <th scope="col" className="w-[240px] py-3 pr-4 pl-2">
                    <span className="sr-only">Azioni</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {holders.map((h) => (
                  <tr key={h.id} className={DS_ROW}>
                    <td className="py-3 pr-2.5 pl-4 font-semibold text-ds-ink">{h.nome}</td>
                    <td className="max-w-[320px] px-2.5 py-3">{descrizione(h)}</td>
                    <td className="px-2.5 py-3">{statoBadge(h)}</td>
                    <td className="py-2 pr-4 pl-2">{actions(h)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden">
            {holders.map((h) => (
              <li key={h.id} className={DS_CARD}>
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 font-semibold text-ds-ink">{h.nome}</span>
                  {statoBadge(h)}
                </div>
                {h.descrizione && descrizione(h)}
                <div className="flex justify-end border-t border-ds-line pt-3">{actions(h)}</div>
              </li>
            ))}
          </ul>

          {holdersTotal > PAGE_SIZE && (
            <OmPagination
              page={page}
              pageSize={PAGE_SIZE}
              total={holdersTotal}
              unit={holdersTotal === 1 ? 'collaboratore' : 'collaboratori'}
              onChange={setPage}
            />
          )}
        </div>
      )}

      <HolderCreateModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) load()
        }}
      />
      {/* key: la modale riparte dai valori del collaboratore scelto (useState li legge al montaggio) */}
      <HolderEditModal
        key={editHolderId ?? 'nessuno'}
        open={editHolderId != null}
        onOpenChange={(open) => {
          if (!open) setEditHolderId(null)
        }}
        holder={editing}
      />
      <AccountCreateModal
        open={newAccountHolderId != null}
        onOpenChange={(open) => {
          if (!open) setNewAccountHolderId(null)
        }}
        defaultHolderId={newAccountHolderId ?? undefined}
      />
      <WalletCreateModal
        open={newWalletHolderId != null}
        onOpenChange={(open) => {
          if (!open) setNewWalletHolderId(null)
        }}
        defaultHolderId={newWalletHolderId ?? undefined}
      />
    </>
  )
}
