'use client'

import { useCallback, useEffect, useState } from 'react'
import { BookMarked, Pencil, Plus, Search, X } from 'lucide-react'

import { dsButtonClass } from '@/components/landing/ds-primitives'
import { DsBadge } from '@/components/landing/ds-data'
import { OmBookLogo, OmPagination } from '@/components/strumenti/scanner-v2/om-ds'
import { GIconButton, GTextField } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { BookCreateModal, BookEditModal } from '@/components/profit-tracker/book-modals'
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
import { bookLogoSlug } from '@/lib/profit-tracker/ongoing-bets'
import { cn } from '@/lib/utils'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { Book } from '@/types/profit-tracker'

/**
 * I book personali della pagina Impostazioni sul design OddWise (§14.361), scheda «Book»: filtri
 * per nome e descrizione, tabella (schede sul telefono) con il logo quando il sito lo ha, tipo
 * Exchange o Bookmaker, Modifica per i book personali e «Sola lettura» per quelli globali.
 * Pagine e filtri li fa il backend come prima; i filtri partono mentre si scrive, come in
 * Gestione conti, invece che col pulsante «Filtra».
 */

const PAGE_SIZE = 20

export function BooksView() {
  const books = useProfitTrackerStore((s) => s.books)
  const booksTotal = useProfitTrackerStore((s) => s.booksTotal) ?? 0
  const isLoading = useProfitTrackerStore((s) => s.isLoadingBooks)
  const booksError = useProfitTrackerStore((s) => s.booksError)
  const fetchBooks = useProfitTrackerStore((s) => s.fetchBooks)

  const [createOpen, setCreateOpen] = useState(false)
  const [editBookId, setEditBookId] = useState<string | null>(null)
  const [filterNome, setFilterNome] = useState('')
  const [filterDescrizione, setFilterDescrizione] = useState('')
  /** Da 0, come la paginazione del design; il backend conta da 1. */
  const [page, setPage] = useState(0)

  const load = useCallback(() => {
    fetchBooks({
      page: page + 1,
      limit: PAGE_SIZE,
      nome: filterNome.trim() || undefined,
      descrizione: filterDescrizione.trim() || undefined,
    }).catch(() => {})
  }, [fetchBooks, page, filterNome, filterDescrizione])

  useEffect(() => {
    load()
  }, [load])

  const editing = books.find((b) => b.id === editBookId) ?? null

  const active: { key: string; label: string; clear: () => void }[] = []
  if (filterNome.trim())
    active.push({ key: 'nome', label: `«${filterNome.trim()}»`, clear: () => setFilterNome('') })
  if (filterDescrizione.trim())
    active.push({
      key: 'descrizione',
      label: `Descrizione «${filterDescrizione.trim()}»`,
      clear: () => setFilterDescrizione(''),
    })
  const filtered = active.length > 0

  const resetFilters = () => {
    setFilterNome('')
    setFilterDescrizione('')
    setPage(0)
  }

  const isEmpty = !isLoading && !booksError && books.length === 0

  const newBookButton = (
    <button
      type="button"
      onClick={() => setCreateOpen(true)}
      className={dsButtonClass('primary', 'md')}
    >
      <Plus className="h-5 w-5" aria-hidden />
      Nuovo book
    </button>
  )

  /* ---------- Pezzi delle righe ---------- */

  const nameCell = (b: Book) => {
    const slug = bookLogoSlug(b)
    return (
      <span className="flex min-w-0 flex-wrap items-center gap-2">
        {slug && <OmBookLogo slug={slug} name={b.nome} size="sm" />}
        <span className="font-semibold text-ds-ink">{b.nome}</span>
        {b.isGlobal && <DsBadge tone="info">Globale</DsBadge>}
      </span>
    )
  }

  const typeBadge = (b: Book) =>
    b.isExchange ? (
      <DsBadge tone="brand">Exchange</DsBadge>
    ) : (
      <DsBadge tone="neutral">Bookmaker</DsBadge>
    )

  const descrizione = (b: Book) =>
    b.descrizione ? (
      <span title={b.descrizione} className="ds-body-sm block truncate text-ds-ink-muted">
        {b.descrizione}
      </span>
    ) : (
      <span className="text-ds-ink-faint">—</span>
    )

  const actions = (b: Book) =>
    b.isGlobal ? (
      <span className="ds-body-sm text-ds-ink-muted">Sola lettura</span>
    ) : (
      <GIconButton label={`Modifica ${b.nome}`} onClick={() => setEditBookId(b.id)}>
        <Pencil className="h-4 w-4" aria-hidden />
      </GIconButton>
    )

  return (
    <>
      <DsPageHeader
        title="Book personali"
        description="I bookmaker e gli exchange da usare nei tuoi conti."
        actions={newBookButton}
      />

      <div className={cn(DS_PANEL, 'grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2')}>
        <GTextField
          id="book-filtro-nome"
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
          id="book-filtro-descrizione"
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
            {!isLoading || books.length > 0 ? countLabel(booksTotal, 'book', 'book') : ''}
          </span>
        )}
      </div>

      {booksError && <DsAlert>{booksError}</DsAlert>}

      {isLoading && books.length === 0 && (
        <p className="ds-body-sm m-0 text-ds-ink-muted">Caricamento dei book…</p>
      )}
      {isEmpty && !filtered && (
        <DsEmptyState
          icon={<BookMarked className="h-8 w-8" strokeWidth={1.75} aria-hidden />}
          title="Nessun book personale registrato"
          description="Aggiungi un sito che non trovi fra quelli del tracker."
          action={newBookButton}
        />
      )}
      {isEmpty && filtered && (
        <DsEmptyState
          icon={<Search className="h-8 w-8" strokeWidth={1.75} aria-hidden />}
          title="Nessun book con questi filtri"
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

      {books.length > 0 && (
        <div className={cn('flex flex-col gap-3', isLoading && 'opacity-60')}>
          <div className={DS_TABLE_WRAP}>
            <table className="w-full border-collapse">
              <caption className="sr-only">Book personali</caption>
              <thead>
                <tr className={DS_THEAD_ROW}>
                  <th scope="col" className="w-[300px] py-3 pr-2.5 pl-4">
                    Nome
                  </th>
                  <th scope="col" className="min-w-[180px] px-2.5 py-3">
                    Descrizione
                  </th>
                  <th scope="col" className="w-[140px] px-2.5 py-3">
                    Tipo
                  </th>
                  <th scope="col" className="w-[120px] py-3 pr-4 pl-2 text-right">
                    <span className="sr-only">Azioni</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {books.map((b) => (
                  <tr key={b.id} className={DS_ROW}>
                    <td className="py-3 pr-2.5 pl-4">{nameCell(b)}</td>
                    <td className="max-w-[360px] px-2.5 py-3">{descrizione(b)}</td>
                    <td className="px-2.5 py-3">{typeBadge(b)}</td>
                    <td className="py-2 pr-4 pl-2 text-right">{actions(b)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden">
            {books.map((b) => (
              <li key={b.id} className={DS_CARD}>
                <div className="flex items-center justify-between gap-3">
                  {nameCell(b)}
                  <div className="flex flex-none items-center gap-2">
                    {typeBadge(b)}
                    {actions(b)}
                  </div>
                </div>
                {b.descrizione && descrizione(b)}
              </li>
            ))}
          </ul>

          {booksTotal > PAGE_SIZE && (
            <OmPagination
              page={page}
              pageSize={PAGE_SIZE}
              total={booksTotal}
              unit="book"
              onChange={setPage}
            />
          )}
        </div>
      )}

      <BookCreateModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) load()
        }}
      />
      {/* key: la modale riparte dai valori del book scelto (useState li legge al montaggio) */}
      <BookEditModal
        key={editBookId ?? 'nessuno'}
        open={editBookId != null}
        onOpenChange={(open) => {
          if (!open) {
            setEditBookId(null)
            load()
          }
        }}
        book={editing}
      />
    </>
  )
}
