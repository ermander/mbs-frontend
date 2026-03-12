'use client'

import { useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { Book } from '@/types/profit-tracker'

interface BookCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BookCreateModal({ open, onOpenChange }: BookCreateModalProps) {
  const addBook = useProfitTrackerStore((s) => s.addBook)

  const [nome, setNome] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [isExchange, setIsExchange] = useState(false)

  const handleSave = () => {
    if (!nome.trim()) return
    addBook({
      nome: nome.trim(),
      descrizione: descrizione || undefined,
      isExchange,
    })
    setNome('')
    setDescrizione('')
    setIsExchange(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuovo book personale</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-4 pt-0 text-sm">
          <div className="space-y-1.5">
            <Label htmlFor="book-nome">Nome</Label>
            <Input
              id="book-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Es. SportMarket, Pinnacle..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="book-desc">Descrizione (opzionale)</Label>
            <textarea
              id="book-desc"
              className="min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="book-exchange"
              type="checkbox"
              className="h-4 w-4 rounded border border-input"
              checked={isExchange}
              onChange={(e) => setIsExchange(e.target.checked)}
            />
            <Label htmlFor="book-exchange" className="text-sm">
              È un exchange
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button type="button" onClick={handleSave} disabled={!nome.trim()}>
            Salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface BookEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  book: Book | null
}

export function BookEditModal({ open, onOpenChange, book }: BookEditModalProps) {
  const updateBook = useProfitTrackerStore((s) => s.updateBook)

  const [nome, setNome] = useState(book?.nome ?? '')
  const [descrizione, setDescrizione] = useState(book?.descrizione ?? '')
  const [isExchange, setIsExchange] = useState<boolean>(book?.isExchange ?? false)

  if (!book) return null

  const handleSave = () => {
    if (!nome.trim()) return
    updateBook(book.id, {
      nome: nome.trim(),
      descrizione: descrizione || undefined,
      isExchange,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifica book</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-4 pt-0 text-sm">
          <div className="space-y-1.5">
            <Label htmlFor="book-edit-nome">Nome</Label>
            <Input id="book-edit-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="book-edit-desc">Descrizione (opzionale)</Label>
            <textarea
              id="book-edit-desc"
              className="min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="book-edit-exchange"
              type="checkbox"
              className="h-4 w-4 rounded border border-input"
              checked={isExchange}
              onChange={(e) => setIsExchange(e.target.checked)}
            />
            <Label htmlFor="book-edit-exchange" className="text-sm">
              È un exchange
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button type="button" onClick={handleSave} disabled={!nome.trim()}>
            Salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
