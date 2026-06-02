'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'

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
import { SearchableSelect } from '@/components/ui/searchable-select'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { sanitizeDecimal } from '@/lib/utils'
import { getResponseStatus } from '@/lib/error-utils'
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
  portalContainer,
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
  }) => Promise<void>
  portalContainer: HTMLDivElement | null
}) {
  const holderOptions = useMemo(
    () => holders.map((h) => ({ value: h.id, label: h.nome })),
    [holders],
  )
  const [holderId, setHolderId] = useState(defaultHolderId || holders[0]?.id || '')
  const [nome, setNome] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [saldoIniziale, setSaldoIniziale] = useState('')
  const [stato, setStato] = useState<EnabledStatus>('abilitato')
  const [saving, setSaving] = useState(false)

  const handleSaveAsync = async () => {
    if (!holderId || !nome.trim()) return
    setSaving(true)
    try {
      const iniziale = Number.parseFloat(saldoIniziale.replace(',', '.')) || 0
      await onSave({
        holderId,
        nome: nome.trim(),
        descrizione,
        saldoIniziale: iniziale,
        stato,
      })
      toast.success('Wallet creato con successo')
      setNome('')
      setDescrizione('')
      setSaldoIniziale('')
      onClose()
    } catch (err: unknown) {
      const status = getResponseStatus(err)
      if (status === 409) {
        toast.error("Esiste già un wallet con questo nome per l'intestatario selezionato")
      } else {
        toast.error('Errore durante il salvataggio')
      }
    } finally {
      setSaving(false)
    }
  }

  const canSave = holderId && nome.trim() !== '' && !saving

  return (
    <div className="space-y-4 p-4 pt-0 text-sm">
      <div className="space-y-1.5">
        <Label htmlFor="wallet-holder">Intestatario</Label>
        <SearchableSelect
          id="wallet-holder"
          options={holderOptions}
          value={holderId}
          onChange={setHolderId}
          allowEmpty={false}
          placeholder="Seleziona intestatario"
          searchPlaceholder="Cerca intestatario..."
          portalContainer={portalContainer}
        />
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
          type="text"
          inputMode="decimal"
          value={saldoIniziale}
          onChange={(e) => setSaldoIniziale(sanitizeDecimal(e.target.value))}
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
        <Button variant="outline" type="button" onClick={onClose} disabled={saving}>
          Annulla
        </Button>
        <Button type="button" onClick={handleSaveAsync} disabled={!canSave}>
          {saving ? 'Salvataggio...' : 'Salva'}
        </Button>
      </DialogFooter>
    </div>
  )
}

export function WalletCreateModal({ open, onOpenChange, defaultHolderId }: WalletCreateModalProps) {
  const holders = useProfitTrackerStore((s) => s.allHolders)
  const addWallet = useProfitTrackerStore((s) => s.addWallet)
  const [dropdownPortalEl, setDropdownPortalEl] = useState<HTMLDivElement | null>(null)

  const handleSave = async (payload: {
    holderId: string
    nome: string
    descrizione: string
    saldoIniziale: number
    stato: EnabledStatus
  }) => {
    await addWallet({
      holderId: payload.holderId,
      nome: payload.nome,
      descrizione: payload.descrizione || undefined,
      saldoAttuale: payload.saldoIniziale,
      stato: payload.stato,
      bloccato: false,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <div
          ref={setDropdownPortalEl}
          className="pointer-events-none fixed inset-0 z-[9998]"
          aria-hidden
        />
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
            portalContainer={dropdownPortalEl}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
