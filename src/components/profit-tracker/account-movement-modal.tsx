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
import type { AccountMovementType } from '@/types/profit-tracker'

interface AccountMovementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultAccountId?: string
}

export function AccountMovementModal({
  open,
  onOpenChange,
  defaultAccountId,
}: AccountMovementModalProps) {
  const accounts = useProfitTrackerStore((s) => s.accounts)
  const wallets = useProfitTrackerStore((s) => s.wallets)
  const addAccountMovement = useProfitTrackerStore((s) => s.addAccountMovement)

  const [accountId, setAccountId] = useState(defaultAccountId ?? accounts[0]?.id ?? '')
  const [walletId, setWalletId] = useState(wallets[0]?.id ?? '')
  const [tipo, setTipo] = useState<AccountMovementType>('deposito')
  const [valore, setValore] = useState('')
  const [dataRegistrazione, setDataRegistrazione] = useState(new Date().toISOString().slice(0, 10))
  const [descrizione, setDescrizione] = useState('')

  const handleSave = () => {
    const importo = Number.parseFloat(valore.replace(',', '.'))
    if (!accountId || !Number.isFinite(importo)) return

    addAccountMovement({
      accountId,
      tipo,
      walletId: tipo === 'riconciliazione' ? undefined : walletId,
      valore: importo,
      dataRegistrazione: new Date(dataRegistrazione).toISOString(),
      descrizione: descrizione || undefined,
    })

    setValore('')
    setDescrizione('')
    onOpenChange(false)
  }

  const canSave =
    accountId &&
    valore.trim() !== '' &&
    Number.isFinite(Number.parseFloat(valore.replace(',', '.')))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuovo movimento conto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-4 pt-0 text-sm">
          <div className="space-y-1.5">
            <Label htmlFor="mov-tipo">Metodo</Label>
            <select
              id="mov-tipo"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as AccountMovementType)}
            >
              <option value="deposito">Deposito</option>
              <option value="prelievo">Prelievo</option>
              <option value="riconciliazione">Riconciliazione</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mov-account">Conto</Label>
            <select
              id="mov-account"
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
          {tipo !== 'riconciliazione' && (
            <div className="space-y-1.5">
              <Label htmlFor="mov-wallet">Wallet</Label>
              <select
                id="mov-wallet"
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
          )}
          <div className="space-y-1.5">
            <Label htmlFor="mov-valore">Movimento (€)</Label>
            <Input
              id="mov-valore"
              type="number"
              inputMode="decimal"
              value={valore}
              onChange={(e) => setValore(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mov-data">Registrato il</Label>
            <Input
              id="mov-data"
              type="date"
              value={dataRegistrazione}
              onChange={(e) => setDataRegistrazione(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mov-desc">Descrizione (opzionale)</Label>
            <textarea
              id="mov-desc"
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
