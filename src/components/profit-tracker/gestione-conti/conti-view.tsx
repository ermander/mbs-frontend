'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Landmark, Lock, LockOpen, Pencil, Plus, Scale, Search, X } from 'lucide-react'
import { toast } from 'sonner'

import { dsButtonClass } from '@/components/landing/ds-primitives'
import { DsBadge } from '@/components/landing/ds-data'
import {
  OmBookLogo,
  OmDropdown,
  OmPagination,
  type OmOption,
} from '@/components/strumenti/scanner-v2/om-ds'
import { GIconButton, GSelect } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { AccountCreateModal } from '@/components/profit-tracker/account-create-modal'
import { AccountEditModal } from '@/components/profit-tracker/account-edit-modal'
import { AccountMovementModal } from '@/components/profit-tracker/account-movement-modal'
import {
  DS_CARD,
  DS_PANEL,
  DS_ROW,
  DS_TABLE_WRAP,
  DS_THEAD_ROW,
  DsAlert,
  DsAmount,
  DsBadgeToggle,
  DsBalancePanel,
  DsEmptyState,
  DsPageHeader,
  countLabel,
} from '@/components/profit-tracker/tracker-ds'
import { getErrorMessage } from '@/lib/error-utils'
import { bookLogoSlug } from '@/lib/profit-tracker/ongoing-bets'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { Account } from '@/types/profit-tracker'

/**
 * I conti del tracker sul design OddWise (§14.350), scheda «Conti» di Gestione conti: saldo dei
 * conti filtrati, filtri per collaboratore, book, stato e blocco, ordine per saldo, tabella (schede
 * sul telefono) con stato e blocco cambiabili dalla riga, Nuovo movimento e Modifica. Le pagine e
 * i filtri li fa il backend come prima.
 */

const PAGE_SIZE = 20

type Bloccato = '' | 'solo' | 'no'

const STATO_FILTER = [
  { value: '', label: 'Tutti gli stati' },
  { value: 'abilitato', label: 'Abilitati' },
  { value: 'disabilitato', label: 'Non abilitati' },
]
const BLOCCATO_FILTER = [
  { value: '', label: 'Bloccati e liberi' },
  { value: 'solo', label: 'Solo bloccati' },
  { value: 'no', label: 'Solo liberi' },
]
const SORT_OPTIONS = [
  { value: 'desc', label: 'Saldo, dal più alto' },
  { value: 'asc', label: 'Saldo, dal più basso' },
]

const day = (iso: string) => new Date(iso).toLocaleDateString('it-IT')

export function ContiView() {
  const accounts = useProfitTrackerStore((s) => s.accounts)
  const accountsTotal = useProfitTrackerStore((s) => s.accountsTotal)
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const isLoadingAccounts = useProfitTrackerStore((s) => s.isLoadingAccounts)
  const accountsError = useProfitTrackerStore((s) => s.accountsError)
  const holders = useProfitTrackerStore((s) => s.allHolders)
  const books = useProfitTrackerStore((s) => s.allBooks)
  const fetchHolders = useProfitTrackerStore((s) => s.fetchAllHolders)
  const fetchAllBooks = useProfitTrackerStore((s) => s.fetchAllBooks)
  const fetchAccounts = useProfitTrackerStore((s) => s.fetchAccounts)
  const updateAccount = useProfitTrackerStore((s) => s.updateAccount)
  const isAdmin = useAuthStore((s) => s.user?.role) === 'ADMIN_ROLE'

  const [createOpen, setCreateOpen] = useState(false)
  const [movementForAccount, setMovementForAccount] = useState<Account | undefined>(undefined)
  const [editingAccountId, setEditingAccountId] = useState<string | undefined>(undefined)
  const [busyId, setBusyId] = useState<string | null>(null)
  /** Da 0, come la paginazione del design; il backend conta da 1. */
  const [page, setPage] = useState(0)
  const [holderIds, setHolderIds] = useState<string[]>([])
  const [bookIds, setBookIds] = useState<string[]>([])
  const [filterStato, setFilterStato] = useState('')
  const [filterBloccato, setFilterBloccato] = useState<Bloccato>('')
  const [sortSaldo, setSortSaldo] = useState<'asc' | 'desc'>('desc')

  const loadAccounts = useCallback(() => {
    void fetchAccounts({
      page: page + 1,
      limit: PAGE_SIZE,
      holderIds: holderIds.length > 0 ? holderIds.join(',') : undefined,
      bookIds: bookIds.length > 0 ? bookIds.join(',') : undefined,
      status: filterStato || undefined,
      blocked: filterBloccato === 'solo' ? true : filterBloccato === 'no' ? false : undefined,
      sortSaldo,
    })
  }, [fetchAccounts, page, holderIds, bookIds, filterStato, filterBloccato, sortSaldo])

  useEffect(() => {
    void fetchHolders()
    void fetchAllBooks()
    void fetchAllAccounts()
  }, [fetchHolders, fetchAllBooks, fetchAllAccounts])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  // Il saldo dei conti con i filtri di collaboratore e book (stato e blocco non lo cambiano).
  const saldoTotale = useMemo(
    () =>
      allAccounts
        .filter(
          (a) =>
            (holderIds.length === 0 || holderIds.includes(a.holderId)) &&
            (bookIds.length === 0 || bookIds.includes(a.bookId)),
        )
        .reduce((sum, a) => sum + (Number(a.saldoAttuale) || 0), 0),
    [allAccounts, holderIds, bookIds],
  )

  const holderName = (id: string) => holders.find((h) => h.id === id)?.nome ?? '—'
  const bookOf = (id: string) => books.find((b) => b.id === id)

  const holderOptions: OmOption[] = useMemo(
    () =>
      holders
        .map((h) => ({ value: h.id, label: h.nome }))
        .sort((a, b) => a.label.localeCompare(b.label, 'it')),
    [holders],
  )
  const bookOptions: OmOption[] = useMemo(
    () =>
      books
        .map((b) => ({
          value: b.id,
          label: b.nome,
          render: (
            <span className="flex min-w-0 items-center gap-2.5">
              <OmBookLogo slug={bookLogoSlug(b)} name={b.nome} size="sm" />
              <span className="truncate">{b.nome}</span>
            </span>
          ),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'it')),
    [books],
  )

  const resetFilters = () => {
    setHolderIds([])
    setBookIds([])
    setFilterStato('')
    setFilterBloccato('')
    setPage(0)
  }
  const active: { key: string; label: string; clear: () => void }[] = []
  for (const id of holderIds)
    active.push({
      key: `h-${id}`,
      label: `Collaboratore: ${holderName(id)}`,
      clear: () => setHolderIds((ids) => ids.filter((x) => x !== id)),
    })
  for (const id of bookIds)
    active.push({
      key: `b-${id}`,
      label: `Book: ${bookOf(id)?.nome ?? '—'}`,
      clear: () => setBookIds((ids) => ids.filter((x) => x !== id)),
    })
  if (filterStato)
    active.push({
      key: 'stato',
      label: filterStato === 'abilitato' ? 'Abilitati' : 'Non abilitati',
      clear: () => setFilterStato(''),
    })
  if (filterBloccato)
    active.push({
      key: 'bloccato',
      label: filterBloccato === 'solo' ? 'Solo bloccati' : 'Solo liberi',
      clear: () => setFilterBloccato(''),
    })

  // Stato e blocco dall'elenco: lo store salva sul backend, qui si avvisa se fallisce (§14.106).
  const toggleStato = async (account: Account) => {
    setBusyId(account.id)
    try {
      await updateAccount(account.id, {
        stato: account.stato === 'abilitato' ? 'disabilitato' : 'abilitato',
      })
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Impossibile aggiornare lo stato del conto.')
    } finally {
      setBusyId(null)
    }
  }
  const toggleBloccato = async (account: Account) => {
    setBusyId(account.id)
    try {
      await updateAccount(account.id, { bloccato: !account.bloccato })
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Impossibile aggiornare il blocco del conto.')
    } finally {
      setBusyId(null)
    }
  }

  const total = accountsTotal ?? accounts.length
  const filtered = active.length > 0
  const isEmpty = !isLoadingAccounts && !accountsError && accounts.length === 0

  /* ---------- Pezzi delle righe ---------- */

  const bookCell = (a: Account) => {
    const book = bookOf(a.bookId)
    return (
      <div className="flex min-w-0 flex-col items-start gap-1">
        {book ? (
          <OmBookLogo slug={bookLogoSlug(book)} name={book.nome} size="sm" />
        ) : (
          <span className="font-semibold text-ds-ink">{a.nome}</span>
        )}
        <span className="ds-caption text-ds-ink-muted">{holderName(a.holderId)}</span>
      </div>
    )
  }

  const statusCell = (a: Account) => (
    <div className="flex flex-wrap items-center gap-1.5">
      <DsBadgeToggle
        tone={a.stato === 'abilitato' ? 'profit' : 'neutral'}
        label={a.stato === 'abilitato' ? 'Abilitato' : 'Non abilitato'}
        actionLabel={a.stato === 'abilitato' ? 'Disabilita il conto' : 'Abilita il conto'}
        onClick={() => void toggleStato(a)}
        disabled={busyId === a.id}
      />
      {isAdmin ? (
        <DsBadgeToggle
          tone={a.bloccato ? 'warning' : 'neutral'}
          label={a.bloccato ? 'Bloccato' : 'Libero'}
          actionLabel={a.bloccato ? 'Sblocca il conto' : 'Segna il conto come bloccato'}
          icon={
            a.bloccato ? (
              <Lock className="h-3 w-3" aria-hidden />
            ) : (
              <LockOpen className="h-3 w-3" aria-hidden />
            )
          }
          onClick={() => void toggleBloccato(a)}
          disabled={busyId === a.id}
        />
      ) : (
        a.bloccato && (
          <DsBadge tone="warning">
            <Lock className="h-3 w-3" aria-hidden />
            Bloccato
          </DsBadge>
        )
      )}
    </div>
  )

  const actions = (a: Account) => (
    <div className="flex items-center justify-end gap-0.5">
      <button
        type="button"
        onClick={() => setMovementForAccount(a)}
        className={cn(dsButtonClass('ghost', 'sm'), 'px-2')}
      >
        Movimento
      </button>
      <GIconButton label="Modifica" onClick={() => setEditingAccountId(a.id)}>
        <Pencil className="h-4 w-4" aria-hidden />
      </GIconButton>
    </div>
  )

  const descrizione = (a: Account) =>
    a.descrizione ? (
      <span title={a.descrizione} className="ds-body-sm block truncate text-ds-ink-muted">
        {a.descrizione}
      </span>
    ) : (
      <span className="text-ds-ink-faint">—</span>
    )

  const editing =
    editingAccountId != null
      ? (accounts.find((a) => a.id === editingAccountId) ??
        allAccounts.find((a) => a.id === editingAccountId))
      : undefined

  return (
    <>
      <DsPageHeader
        title="Conti"
        description="I conti dei collaboratori sui siti di scommesse, con il saldo di ciascuno."
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className={dsButtonClass('primary', 'md')}
          >
            <Plus className="h-5 w-5" aria-hidden />
            Nuovo conto
          </button>
        }
      />

      <DsBalancePanel
        icon={Scale}
        label={`Saldo attuale${holderIds.length + bookIds.length > 0 ? ' dei conti filtrati' : ''}`}
        value={saldoTotale}
      />

      <div
        className={cn(DS_PANEL, 'grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2 lg:grid-cols-4')}
      >
        <OmDropdown
          id="conti-filtro-collaboratore"
          label="Collaboratore"
          allLabel="Tutti i collaboratori"
          size="sm"
          emptyText="Nessun collaboratore con questo nome."
          options={holderOptions}
          selected={holderIds}
          onChange={(next) => {
            setHolderIds(next)
            setPage(0)
          }}
        />
        <OmDropdown
          id="conti-filtro-book"
          label="Book"
          allLabel="Tutti i book"
          size="sm"
          emptyText="Nessun book con questo nome."
          options={bookOptions}
          selected={bookIds}
          onChange={(next) => {
            setBookIds(next)
            setPage(0)
          }}
        />
        <GSelect
          id="conti-filtro-stato"
          label="Stato"
          size="sm"
          options={STATO_FILTER}
          value={filterStato}
          onChange={(v) => {
            setFilterStato(v)
            setPage(0)
          }}
        />
        <GSelect
          id="conti-filtro-bloccato"
          label="Blocco"
          size="sm"
          options={BLOCCATO_FILTER}
          value={filterBloccato}
          onChange={(v) => {
            setFilterBloccato(v as Bloccato)
            setPage(0)
          }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
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
              {accountsTotal != null ? countLabel(accountsTotal, 'conto', 'conti') : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <label htmlFor="conti-ordina" className="ds-body-sm text-ds-ink-muted">
            Ordina per
          </label>
          <GSelect
            id="conti-ordina"
            options={SORT_OPTIONS}
            value={sortSaldo}
            onChange={(v) => {
              setSortSaldo(v as 'asc' | 'desc')
              setPage(0)
            }}
            className="w-[210px]"
          />
        </div>
      </div>

      {accountsError && <DsAlert>{accountsError}</DsAlert>}

      {isLoadingAccounts && accounts.length === 0 && (
        <p className="ds-body-sm m-0 text-ds-ink-muted">Caricamento dei conti…</p>
      )}
      {isEmpty && !filtered && (
        <DsEmptyState
          icon={<Landmark className="h-8 w-8" strokeWidth={1.75} aria-hidden />}
          title="Nessun conto registrato"
          description="Aggiungi il primo conto di un collaboratore su un sito di scommesse: lo ritrovi qui con il suo saldo."
          action={
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className={dsButtonClass('primary', 'md')}
            >
              <Plus className="h-5 w-5" aria-hidden />
              Nuovo conto
            </button>
          }
        />
      )}
      {isEmpty && filtered && (
        <DsEmptyState
          icon={<Search className="h-8 w-8" strokeWidth={1.75} aria-hidden />}
          title="Nessun conto con questi filtri"
          description="Togli un filtro o scegli un altro collaboratore."
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

      {accounts.length > 0 && (
        <div className={cn('flex flex-col gap-3', isLoadingAccounts && 'opacity-60')}>
          <div className={DS_TABLE_WRAP}>
            <table className="w-full border-collapse">
              <caption className="sr-only">
                Conti, ordinati per saldo dal più {sortSaldo === 'desc' ? 'alto' : 'basso'}
              </caption>
              <thead>
                <tr className={DS_THEAD_ROW}>
                  <th scope="col" className="w-[180px] py-3 pr-2.5 pl-4">
                    Book e collaboratore
                  </th>
                  <th scope="col" className="min-w-[160px] px-2.5 py-3">
                    Descrizione
                  </th>
                  <th scope="col" className="w-[104px] px-2.5 py-3">
                    Creato il
                  </th>
                  <th scope="col" className="w-[128px] px-2.5 py-3 text-right">
                    Saldo attuale
                  </th>
                  <th scope="col" className="w-[200px] px-2.5 py-3">
                    Stato
                  </th>
                  <th scope="col" className="w-[136px] py-3 pr-4 pl-2">
                    <span className="sr-only">Azioni</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className={DS_ROW}>
                    <td className="py-3 pr-2.5 pl-4">{bookCell(a)}</td>
                    <td className="max-w-[240px] px-2.5 py-3">{descrizione(a)}</td>
                    <td className="ds-num-sm px-2.5 py-3 whitespace-nowrap text-ds-ink-muted">
                      {day(a.createdAt)}
                    </td>
                    <td className="px-2.5 py-3 text-right">
                      <DsAmount value={a.saldoAttuale} neutral size="sm" />
                    </td>
                    <td className="px-2.5 py-3">{statusCell(a)}</td>
                    <td className="py-2 pr-4 pl-2">{actions(a)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden">
            {accounts.map((a) => (
              <li key={a.id} className={DS_CARD}>
                <div className="flex items-start justify-between gap-3">
                  {bookCell(a)}
                  <DsAmount value={a.saldoAttuale} neutral />
                </div>
                {a.descrizione && descrizione(a)}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {statusCell(a)}
                  <span className="ds-caption text-ds-ink-muted">creato il {day(a.createdAt)}</span>
                </div>
                <div className="flex justify-end border-t border-ds-line pt-3">{actions(a)}</div>
              </li>
            ))}
          </ul>

          {total > PAGE_SIZE && (
            <OmPagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              unit={total === 1 ? 'conto' : 'conti'}
              onChange={setPage}
            />
          )}
        </div>
      )}

      <AccountCreateModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) loadAccounts()
        }}
      />
      <AccountMovementModal
        open={movementForAccount != null}
        onOpenChange={(open) => {
          if (!open) {
            setMovementForAccount(undefined)
            loadAccounts()
          }
        }}
        account={movementForAccount}
      />
      {editing && (
        <AccountEditModal
          open
          onOpenChange={(open) => {
            if (!open) setEditingAccountId(undefined)
          }}
          account={editing}
        />
      )}
    </>
  )
}
