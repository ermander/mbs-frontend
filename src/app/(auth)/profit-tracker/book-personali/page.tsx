'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { BookCreateModal, BookEditModal } from '@/components/profit-tracker/book-modals'

export default function BookPersonaliPage() {
  const books = useProfitTrackerStore((s) => s.books)

  const [createOpen, setCreateOpen] = useState(false)
  const [editBookId, setEditBookId] = useState<string | null>(null)

  const currentBook = books.find((b) => b.id === editBookId) ?? null

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

      <BookCreateModal open={createOpen} onOpenChange={setCreateOpen} />
      <BookEditModal
        open={editBookId != null}
        onOpenChange={(open) => {
          if (!open) setEditBookId(null)
        }}
        book={currentBook}
      />
    </section>
  )
}
