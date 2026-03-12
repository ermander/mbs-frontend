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
import type { QuickGameMethod } from '@/types/profit-tracker'

interface QuickBetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const QUICK_METHODS: { value: QuickGameMethod; label: string }[] = [
  { value: 'baccarat', label: 'Baccarat' },
  { value: 'bingo', label: 'Bingo' },
  { value: 'blackjack', label: 'Blackjack' },
  { value: 'casino_live', label: 'Casino Live' },
  { value: 'gratta_e_vinci', label: 'Gratta e Vinci' },
  { value: 'quick_games', label: 'Quick Games' },
  { value: 'roulette', label: 'Roulette' },
  { value: 'slot_machine', label: 'Slot Machine' },
  { value: 'sport', label: 'Sport' },
  { value: 'trading', label: 'Trading' },
  { value: 'altro', label: 'Altro' },
]

export function QuickBetModal({ open, onOpenChange }: QuickBetModalProps) {
  const accounts = useProfitTrackerStore((s) => s.accounts)
  const addQuickBet = useProfitTrackerStore((s) => s.addQuickBet)

  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [method, setMethod] = useState<QuickGameMethod>('slot_machine')
  const [movimento, setMovimento] = useState('')
  const [dataRegistrazione, setDataRegistrazione] = useState(new Date().toISOString().slice(0, 10))
  const [tag, setTag] = useState('')
  const [nota, setNota] = useState('')

  const handleSave = () => {
    const valore = Number.parseFloat(movimento.replace(',', '.'))
    if (!accountId || !Number.isFinite(valore)) return

    addQuickBet({
      accountId,
      quickMethod: method,
      movimento: valore,
      dataRegistrazione: new Date(dataRegistrazione).toISOString(),
      tag: tag || undefined,
      nota: nota || undefined,
    })

    setMovimento('')
    setTag('')
    setNota('')
    onOpenChange(false)
  }

  const canSave =
    accountId &&
    movimento.trim() !== '' &&
    Number.isFinite(Number.parseFloat(movimento.replace(',', '.')))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuova giocata rapida</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-4 pt-0 text-sm">
          <div className="space-y-1.5">
            <Label htmlFor="quick-account">Conto</Label>
            <select
              id="quick-account"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quick-method">Metodo</Label>
            <select
              id="quick-method"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={method}
              onChange={(e) => setMethod(e.target.value as QuickGameMethod)}
            >
              {QUICK_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quick-movimento">Movimento (€)</Label>
            <Input
              id="quick-movimento"
              type="number"
              inputMode="decimal"
              value={movimento}
              onChange={(e) => setMovimento(e.target.value)}
              placeholder="Es. 25 o -15"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quick-data">Registrato il</Label>
            <Input
              id="quick-data"
              type="date"
              value={dataRegistrazione}
              onChange={(e) => setDataRegistrazione(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quick-tag">Tag (opzionale)</Label>
            <Input
              id="quick-tag"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="Es. Sessione serale"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quick-nota">Note (opzionale)</Label>
            <textarea
              id="quick-nota"
              className="min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
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
