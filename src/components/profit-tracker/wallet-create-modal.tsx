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

interface WalletCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WalletCreateModal({ open, onOpenChange }: WalletCreateModalProps) {
  const holders = useProfitTrackerStore((s) => s.holders)
  const addWalletMovement = useProfitTrackerStore((s) => s.addWalletMovement)

  const [holderId, setHolderId] = useState(holders[0]?.id ?? '')
  const [nome, setNome] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [saldoIniziale, setSaldoIniziale] = useState('')
  const [stato, setStato] = useState<EnabledStatus>('abilitato')

  const handleSave = () => {
    if (!holderId || !nome.trim()) return
    const iniziale = Number.parseFloat(saldoIniziale.replace(',', '.')) || 0

    // Prima creiamo il wallet
    let newWalletId = ''
    useProfitTrackerStore.setState((state) => {
      const id = `wallet-${Math.random().toString(36).slice(2, 9)}`
      newWalletId = id
      return {
        ...state,
        wallets: [
          ...state.wallets,
          {
            id,
            holderId,
            nome: nome.trim(),
            descrizione: descrizione || undefined,
            saldoAttuale: iniziale,
            stato,
            createdAt: new Date().toISOString(),
          },
        ],
      }
    })

    if (iniziale !== 0 && newWalletId) {
      addWalletMovement({
        walletId: newWalletId,
        tipo: iniziale > 0 ? 'ricarica' : 'spesa',
        valore: Math.abs(iniziale),
        dataRegistrazione: new Date().toISOString(),
        descrizione: 'Saldo iniziale',
      })
    }

    setNome('')
    setDescrizione('')
    setSaldoIniziale('')
    onOpenChange(false)
  }

  const canSave = holderId && nome.trim() !== ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuovo wallet</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-4 pt-0 text-sm">
          <div className="space-y-1.5">
            <Label htmlFor="wallet-holder">Intestatario</Label>
            <select
              id="wallet-holder"
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
            <Label htmlFor="wallet-nome">Nome</Label>
            <Input
              id="wallet-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Es. Revolut, PayPal..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wallet-desc">Descrizione (opzionale)</Label>
            <textarea
              id="wallet-desc"
              className="min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wallet-saldo">Saldo iniziale (€)</Label>
            <Input
              id="wallet-saldo"
              type="number"
              inputMode="decimal"
              value={saldoIniziale}
              onChange={(e) => setSaldoIniziale(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wallet-stato">Stato</Label>
            <select
              id="wallet-stato"
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
