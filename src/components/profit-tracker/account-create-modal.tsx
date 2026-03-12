'use client'

import { useEffect, useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { EnabledStatus } from '@/types/profit-tracker'

interface AccountCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultHolderId?: string
}

function AccountCreateModalForm({
  defaultHolderId,
  holders,
  books,
  onClose,
  onSave,
}: {
  defaultHolderId?: string
  holders: { id: string; nome: string }[]
  books: { id: string; nome: string }[]
  onClose: () => void
  onSave: (payload: {
    holderId: string
    bookId: string
    descrizione: string
    stato: EnabledStatus
  }) => void | Promise<void>
}) {
  const [holderId, setHolderId] = useState(defaultHolderId || holders[0]?.id || '')
  const [bookId, setBookId] = useState(books[0]?.id ?? '')
  const [descrizione, setDescrizione] = useState('')
  const [stato, setStato] = useState<EnabledStatus>('abilitato')

  const effectiveBookId =
    books.length === 0
      ? ''
      : bookId && books.some((b) => b.id === bookId)
        ? bookId
        : (books[0]?.id ?? '')

  const handleSaveAsync = async () => {
    if (!holderId || !effectiveBookId) return
    await Promise.resolve(
      onSave({
        holderId,
        bookId: effectiveBookId,
        descrizione,
        stato,
      }),
    )
    setDescrizione('')
    onClose()
  }

  const canSave = !!holderId && !!effectiveBookId && books.length > 0

  return (
    <div className="space-y-4 p-4 pt-0 text-sm">
      <div className="space-y-1.5">
        <Label htmlFor="acc-holder">Intestatario</Label>
        <select
          id="acc-holder"
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          value={holderId}
          onChange={(e) => setHolderId(e.target.value)}
        >
          {holders.map((h) => (
            <option key={h.id} value={h.id}>
              {h.nome}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="acc-book">Book</Label>
        <select
          id="acc-book"
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          value={effectiveBookId}
          onChange={(e) => setBookId(e.target.value)}
          disabled={books.length === 0}
        >
          {books.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nome}
            </option>
          ))}
        </select>
        {books.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Nessun book disponibile per questo intestatario.
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="acc-desc">Descrizione (opzionale)</Label>
        <textarea
          id="acc-desc"
          className="min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={descrizione}
          onChange={(e) => setDescrizione(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="acc-stato">Stato</Label>
        <select
          id="acc-stato"
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          value={stato}
          onChange={(e) => setStato(e.target.value as EnabledStatus)}
        >
          <option value="abilitato">Abilitato</option>
          <option value="disabilitato">Non abilitato</option>
        </select>
      </div>
      <DialogFooter>
        <Button variant="outline" type="button" onClick={onClose}>
          Annulla
        </Button>
        <Button type="button" onClick={handleSaveAsync} disabled={!canSave}>
          Salva
        </Button>
      </DialogFooter>
    </div>
  )
}

export function AccountCreateModal({
  open,
  onOpenChange,
  defaultHolderId,
}: AccountCreateModalProps) {
  const holders = useProfitTrackerStore((s) => s.holders)
  const books = useProfitTrackerStore((s) => s.books)
  const fetchBooks = useProfitTrackerStore((s) => s.fetchBooks)
  const addAccount = useProfitTrackerStore((s) => s.addAccount)

  useEffect(() => {
    if (!open) return
    if (!books.length) void fetchBooks()
  }, [open, books.length, fetchBooks])

  const handleSave = async (payload: {
    holderId: string
    bookId: string
    descrizione: string
    stato: EnabledStatus
  }) => {
    await addAccount({
      holderId: payload.holderId,
      bookId: payload.bookId,
      descrizione: payload.descrizione || undefined,
      stato: payload.stato,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuovo conto</DialogTitle>
        </DialogHeader>
        {open && (
          <AccountCreateModalForm
            key="open"
            defaultHolderId={defaultHolderId}
            holders={holders}
            books={books}
            onClose={() => onOpenChange(false)}
            onSave={handleSave}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
