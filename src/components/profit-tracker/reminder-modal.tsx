'use client'

import { useEffect, useMemo, useState } from 'react'

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
import type { ReminderPeriod, Reminder } from '@/types/profit-tracker'

interface ReminderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingReminder?: Reminder | null
}

export function ReminderModal({ open, onOpenChange, editingReminder }: ReminderModalProps) {
  const accounts = useProfitTrackerStore((s) => s.allAccounts)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const createReminder = useProfitTrackerStore((s) => s.createReminder)
  const updateReminder = useProfitTrackerStore((s) => s.updateReminder)
  const remindersError = useProfitTrackerStore((s) => s.remindersError)

  const [accountId, setAccountId] = useState(editingReminder?.accountId ?? '')
  const [descrizione, setDescrizione] = useState(editingReminder?.descrizione ?? '')
  const [dataScadenza, setDataScadenza] = useState(() => {
    if (editingReminder) {
      return editingReminder.dataScadenza.slice(0, 16)
    }
    const now = new Date()
    const iso = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      now.getMinutes(),
    )
      .toISOString()
      .slice(0, 16)
    return iso
  })
  const [periodoNotifica, setPeriodoNotifica] = useState<ReminderPeriod>(
    editingReminder?.periodoNotifica ?? '24h',
  )

  useEffect(() => {
    if (!open) return
    void fetchAllAccounts()
  }, [open, fetchAllAccounts])

  const effectiveAccountId = useMemo(() => {
    if (!accounts.length) return ''
    if (accountId && accounts.some((a) => a.id === accountId)) return accountId
    return editingReminder?.accountId ?? accounts[0]?.id ?? ''
  }, [accounts, accountId, editingReminder])

  const handleSave = async () => {
    const iso = new Date(dataScadenza).toISOString()
    if (editingReminder) {
      await updateReminder(editingReminder.id, {
        accountId: effectiveAccountId || undefined,
        descrizione,
        dataScadenza: iso,
        periodoNotifica,
      })
    } else {
      await createReminder({
        accountId: effectiveAccountId || undefined,
        descrizione,
        dataScadenza: iso,
        periodoNotifica,
      })
    }
    onOpenChange(false)
  }

  const canSave =
    descrizione.trim().length > 0 &&
    dataScadenza &&
    Number.isFinite(new Date(dataScadenza).getTime())

  const title = editingReminder ? 'Modifica promemoria' : 'Nuovo promemoria'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-4 pt-0 text-sm">
          <div className="space-y-1.5">
            <Label htmlFor="rem-account">Conto (opzionale)</Label>
            <select
              id="rem-account"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={effectiveAccountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="">Nessun conto specifico</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rem-desc">Descrizione</Label>
            <textarea
              id="rem-desc"
              className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rem-data">Data e ora di scadenza</Label>
            <Input
              id="rem-data"
              type="datetime-local"
              value={dataScadenza}
              onChange={(e) => setDataScadenza(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rem-periodo">Quando vuoi ricevere la notifica?</Label>
            <select
              id="rem-periodo"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={periodoNotifica}
              onChange={(e) => setPeriodoNotifica(e.target.value as ReminderPeriod)}
            >
              <option value="24h">24 ore prima della scadenza</option>
              <option value="12h">12 ore prima della scadenza</option>
              <option value="scadenza">Esattamente alla scadenza</option>
            </select>
          </div>
          {remindersError && <p className="text-xs text-destructive">{remindersError}</p>}
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
