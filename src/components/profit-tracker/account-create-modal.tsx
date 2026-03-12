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
import type { EnabledStatus } from '@/types/profit-tracker'

interface AccountCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AccountCreateModal({ open, onOpenChange }: AccountCreateModalProps) {
  const holders = useProfitTrackerStore((s) => s.holders)
  const books = useProfitTrackerStore((s) => s.books)
  const addAccount = useProfitTrackerStore((s) => s.addAccount)

  const [holderId, setHolderId] = useState(holders[0]?.id ?? '')
  const [bookId, setBookId] = useState(books[0]?.id ?? '')
  const [nome, setNome] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [stato, setStato] = useState<EnabledStatus>('abilitato')

  const handleSave = () => {
    if (!holderId || !bookId || !nome.trim()) return
    addAccount({
      holderId,
      bookId,
      nome: nome.trim(),
      descrizione: descrizione || undefined,
      stato,
    })
    setNome('')
    setDescrizione('')
    onOpenChange(false)
  }

  const canSave = holderId && bookId && nome.trim() !== ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuovo conto</DialogTitle>
        </DialogHeader>
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
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
            >
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acc-nome">Nome conto</Label>
            <Input
              id="acc-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Es. Bet365 (Emanuele)"
            />
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
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button type="button" onClick={handleSave} disabled={!canSave}>
            Salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
