'use client'

import { useMemo, useState } from 'react'

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
  const holders = useProfitTrackerStore((s) => s.holders)
  const wallets = useProfitTrackerStore((s) => s.wallets)
  const addWalletMovement = useProfitTrackerStore((s) => s.addWalletMovement)
  const isSavingWalletMovement = useProfitTrackerStore((s) => s.isSavingWalletMovement)
  const walletMovementsError = useProfitTrackerStore((s) => s.walletMovementsError)

  const [holderId, setHolderId] = useState('')
  const [walletId, setWalletId] = useState('')
  const [tipo, setTipo] = useState<WalletMovementType>('ricarica')
  const [valore, setValore] = useState('')
  const [dataRegistrazione, setDataRegistrazione] = useState(new Date().toISOString().slice(0, 10))
  const [descrizione, setDescrizione] = useState('')

  const effectiveHolderId =
    holderId || (wallets.length > 0 ? wallets[0].holderId : holders.length > 0 ? holders[0].id : '')

  const holderWallets = useMemo(() => {
    if (!effectiveHolderId) return wallets
    return wallets.filter((w) => w.holderId === effectiveHolderId)
  }, [wallets, effectiveHolderId])

  const effectiveWalletId =
    holderWallets.length === 0
      ? ''
      : walletId && holderWallets.some((w) => w.id === walletId)
        ? walletId
        : (holderWallets[0]?.id ?? '')

  const handleSave = async () => {
    const importo = Number.parseFloat(valore.replace(',', '.'))
    if (!effectiveWalletId || !Number.isFinite(importo)) return

    await addWalletMovement({
      walletId: effectiveWalletId,
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
    effectiveHolderId &&
    effectiveWalletId &&
    valore.trim() !== '' &&
    Number.isFinite(Number.parseFloat(valore.replace(',', '.')))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuova ricarica/spesa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-4 pt-0 text-sm">
          <div className="space-y-1.5">
            <Label htmlFor="topup-holder">Intestatario</Label>
            <select
              id="topup-holder"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={effectiveHolderId}
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
              value={effectiveWalletId}
              onChange={(e) => setWalletId(e.target.value)}
            >
              {holderWallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.nome} ({w.saldoAttuale.toFixed(2)} €)
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
          {walletMovementsError && (
            <p className="text-xs text-destructive">{walletMovementsError}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button type="button" onClick={handleSave} disabled={!canSave || isSavingWalletMovement}>
            Salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
