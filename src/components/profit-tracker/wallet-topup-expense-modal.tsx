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
import type { WalletMovementType } from '@/types/profit-tracker'

interface WalletTopupExpenseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WalletTopupExpenseModal({ open, onOpenChange }: WalletTopupExpenseModalProps) {
  const wallets = useProfitTrackerStore((s) => s.wallets)
  const addWalletMovement = useProfitTrackerStore((s) => s.addWalletMovement)

  const [walletId, setWalletId] = useState(wallets[0]?.id ?? '')
  const [tipo, setTipo] = useState<WalletMovementType>('ricarica')
  const [valore, setValore] = useState('')
  const [dataRegistrazione, setDataRegistrazione] = useState(new Date().toISOString().slice(0, 10))
  const [descrizione, setDescrizione] = useState('')

  const handleSave = () => {
    const importo = Number.parseFloat(valore.replace(',', '.'))
    if (!walletId || !Number.isFinite(importo)) return

    addWalletMovement({
      walletId,
      tipo,
      valore: importo,
      dataRegistrazione: new Date(dataRegistrazione).toISOString(),
      descrizione: descrizione || undefined,
    })

    setValore('')
    setDescrizione('')
    onOpenChange(false)
  }

  const canSave =
    walletId && valore.trim() !== '' && Number.isFinite(Number.parseFloat(valore.replace(',', '.')))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuova ricarica/spesa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-4 pt-0 text-sm">
          <div className="space-y-1.5">
            <Label htmlFor="topup-tipo">Metodo</Label>
            <select
              id="topup-tipo"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as WalletMovementType)}
            >
              <option value="ricarica">Ricarica</option>
              <option value="spesa">Spesa</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="topup-wallet">Wallet</Label>
            <select
              id="topup-wallet"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="topup-valore">Movimento (€)</Label>
            <Input
              id="topup-valore"
              type="number"
              inputMode="decimal"
              value={valore}
              onChange={(e) => setValore(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="topup-data">Registrato il</Label>
            <Input
              id="topup-data"
              type="date"
              value={dataRegistrazione}
              onChange={(e) => setDataRegistrazione(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="topup-desc">Descrizione (opzionale)</Label>
            <textarea
              id="topup-desc"
              className="min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
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
