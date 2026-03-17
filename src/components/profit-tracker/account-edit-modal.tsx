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
import type { Account, EnabledStatus } from '@/types/profit-tracker'

interface AccountEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: Account
}

export function AccountEditModal({ open, onOpenChange, account }: AccountEditModalProps) {
  const updateAccount = useProfitTrackerStore((s) => s.updateAccount)

  const [stato, setStato] = useState<EnabledStatus>(account.stato)
  const [descrizione, setDescrizione] = useState(account.descrizione ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!open) return
    setStato(account.stato)
    setDescrizione(account.descrizione ?? '')
    setError(undefined)
  }, [open, account.stato, account.descrizione])

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen || !isSaving) {
      onOpenChange(nextOpen)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(undefined)
    try {
      await updateAccount(account.id, {
        stato,
        descrizione: descrizione.trim() === '' ? undefined : descrizione.trim(),
      })
      onOpenChange(false)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Errore nel salvataggio del conto'
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges = stato !== account.stato || (account.descrizione ?? '') !== descrizione.trim()

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifica conto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-4 pt-0 text-sm">
          <div className="space-y-1.5">
            <Label>Conto</Label>
            <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {account.nome}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-account-stato">Stato</Label>
            <select
              id="edit-account-stato"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={stato}
              onChange={(e) => setStato(e.target.value as EnabledStatus)}
            >
              <option value="abilitato">Abilitato</option>
              <option value="disabilitato">Non abilitato</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-account-descrizione">Descrizione (opzionale)</Label>
            <textarea
              id="edit-account-descrizione"
              className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Annulla
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving || !hasChanges}>
            Salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
