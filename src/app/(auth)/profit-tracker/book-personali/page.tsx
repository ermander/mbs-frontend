'use client'

import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { BookCreateModal, BookEditModal } from '@/components/profit-tracker/book-modals'

const PAGE_SIZE = 20

export default function BookPersonaliPage() {
  const books = useProfitTrackerStore((s) => s.books)
  const booksTotal = useProfitTrackerStore((s) => s.booksTotal)
  const isLoadingBooks = useProfitTrackerStore((s) => s.isLoadingBooks)
  const booksError = useProfitTrackerStore((s) => s.booksError)
  const fetchBooks = useProfitTrackerStore((s) => s.fetchBooks)

  const [createOpen, setCreateOpen] = useState(false)
  const [editBookId, setEditBookId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [filterNome, setFilterNome] = useState('')
  const [filterDescrizione, setFilterDescrizione] = useState('')

  const currentBook = books.find((b) => b.id === editBookId) ?? null
  const totalPages = booksTotal != null ? Math.max(1, Math.ceil(booksTotal / PAGE_SIZE)) : 1

  const loadPage = useCallback(
    (p: number) => {
      setPage(p)
      fetchBooks({
        page: p,
        limit: PAGE_SIZE,
        nome: filterNome.trim() || undefined,
        descrizione: filterDescrizione.trim() || undefined,
      }).catch(() => {})
    },
    [fetchBooks, filterNome, filterDescrizione],
  )

  useEffect(() => {
    fetchBooks({ page: 1, limit: PAGE_SIZE }).catch(() => {})
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const goToPage = (p: number) => {
    const next = Math.max(1, Math.min(p, totalPages))
    if (next === page) return
    loadPage(next)
  }

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadPage(1)
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Book personali</h1>
          <p className="text-muted-foreground">
            Crea e gestisci i bookmaker personali che puoi poi assegnare ai tuoi conti.
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          Nuovo book
        </Button>
      </header>

      {isLoadingBooks && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
          <span>Caricamento book in corso...</span>
        </div>
      )}
      {booksError && !isLoadingBooks && <p className="text-xs text-destructive">{booksError}</p>}

      <form
        onSubmit={handleFilterSubmit}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/30 p-3"
      >
        <div className="grid gap-1.5">
          <Label htmlFor="filter-nome" className="text-xs text-muted-foreground">
            Nome
          </Label>
          <Input
            id="filter-nome"
            type="text"
            placeholder="Cerca per nome..."
            value={filterNome}
            onChange={(e) => setFilterNome(e.target.value)}
            className="h-8 w-48 text-sm"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="filter-descrizione" className="text-xs text-muted-foreground">
            Descrizione
          </Label>
          <Input
            id="filter-descrizione"
            type="text"
            placeholder="Cerca per descrizione..."
            value={filterDescrizione}
            onChange={(e) => setFilterDescrizione(e.target.value)}
            className="h-8 w-48 text-sm"
          />
        </div>
        <Button type="submit" variant="secondary" size="sm" className="h-8">
          Filtra
        </Button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-border bg-card/70 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/40 text-xs font-medium text-muted-foreground">
              <th className="px-3 py-2 text-left">Nome</th>
              <th className="px-3 py-2 text-left">Descrizione</th>
              <th className="px-3 py-2 text-left">Exchange</th>
              <th className="px-3 py-2 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {books.map((book) => (
              <tr key={book.id} className="border-b border-border/40 last:border-b-0">
                <td className="px-3 py-2 text-sm text-foreground">{book.nome}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {book.descrizione ?? '—'}
                </td>
                <td className="px-3 py-2 text-xs">
                  {book.isExchange ? (
                    <span className="inline-flex rounded-full bg-emerald-600/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      Exchange
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-slate-500/10 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      Bookmaker
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                      onClick={() => setEditBookId(book.id)}
                    >
                      Modifica
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {books.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-xs text-muted-foreground" colSpan={4}>
                  Nessun book personale registrato. Usa &quot;Nuovo book&quot; per crearne uno.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {booksTotal != null && booksTotal > PAGE_SIZE && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            Pagina {page} di {totalPages} — {booksTotal} book in totale
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              disabled={page <= 1 || isLoadingBooks}
              onClick={() => goToPage(page - 1)}
            >
              Indietro
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              disabled={page >= totalPages || isLoadingBooks}
              onClick={() => goToPage(page + 1)}
            >
              Avanti
            </Button>
          </div>
        </div>
      )}

      <BookCreateModal
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) loadPage(page)
          setCreateOpen(open)
        }}
      />
      <BookEditModal
        open={editBookId != null}
        onOpenChange={(open) => {
          if (!open) {
            setEditBookId(null)
            loadPage(page)
          }
        }}
        book={currentBook}
      />
    </section>
  )
}
