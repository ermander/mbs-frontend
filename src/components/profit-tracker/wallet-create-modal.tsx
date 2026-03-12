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
  defaultHolderId?: string
}

function WalletCreateModalForm({
  defaultHolderId,
  holders,
  onClose,
  onSave,
}: {
  defaultHolderId?: string
  holders: { id: string; nome: string }[]
  onClose: () => void
  onSave: (payload: {
    holderId: string
    nome: string
    descrizione: string
    saldoIniziale: number
    stato: EnabledStatus
  }) => void
}) {
  const [holderId, setHolderId] = useState(defaultHolderId || holders[0]?.id || '')
  const [nome, setNome] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [saldoIniziale, setSaldoIniziale] = useState('')
  const [stato, setStato] = useState<EnabledStatus>('abilitato')

  const handleSaveAsync = async () => {
    if (!holderId || !nome.trim()) return
    const iniziale = Number.parseFloat(saldoIniziale.replace(',', '.')) || 0
    onSave({
      holderId,
      nome: nome.trim(),
      descrizione,
      saldoIniziale: iniziale,
      stato,
    })
    setNome('')
    setDescrizione('')
    setSaldoIniziale('')
    onClose()
  }

  const canSave = holderId && nome.trim() !== ''

  return (
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

export function WalletCreateModal({ open, onOpenChange, defaultHolderId }: WalletCreateModalProps) {
  const holders = useProfitTrackerStore((s) => s.holders)
  const addWallet = useProfitTrackerStore((s) => s.addWallet)

  const handleSave = (payload: {
    holderId: string
    nome: string
    descrizione: string
    saldoIniziale: number
    stato: EnabledStatus
  }) => {
    addWallet({
      holderId: payload.holderId,
      nome: payload.nome,
      descrizione: payload.descrizione || undefined,
      saldoAttuale: payload.saldoIniziale,
      stato: payload.stato,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuovo wallet</DialogTitle>
        </DialogHeader>
        {open && (
          <WalletCreateModalForm
            key="open"
            defaultHolderId={defaultHolderId}
            holders={holders}
            onClose={() => onOpenChange(false)}
            onSave={handleSave}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
