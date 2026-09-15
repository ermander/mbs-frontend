'use client'

import { useEffect, useMemo, useState } from 'react'
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
import type { EnabledStatus, PaymentMethod, Wallet } from '@/types/profit-tracker'

interface WalletCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultHolderId?: string
}

interface WalletCreatePayload {
  holderId: string
  paymentMethodId: string
  descrizione: string
  saldoIniziale: number
  stato: EnabledStatus
}

// §14.109: niente più nome libero. Il wallet è un collaboratore × un metodo di
// pagamento del catalogo, uno solo per coppia: la tendina esclude i metodi già aperti.
function WalletCreateModalForm({
  defaultHolderId,
  holders,
  paymentMethods,
  wallets,
  onClose,
  onSave,
  portalContainer,
}: {
  defaultHolderId?: string
  holders: { id: string; nome: string }[]
  paymentMethods: PaymentMethod[]
  wallets: Wallet[]
  onClose: () => void
  onSave: (payload: WalletCreatePayload) => Promise<void>
  portalContainer: HTMLDivElement | null
}) {
  const holderOptions = useMemo(
    () => holders.map((h) => ({ value: h.id, label: h.nome })),
    [holders],
  )
  const [holderId, setHolderId] = useState(defaultHolderId || holders[0]?.id || '')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [saldoIniziale, setSaldoIniziale] = useState('')
  const [stato, setStato] = useState<EnabledStatus>('abilitato')
  const [saving, setSaving] = useState(false)

  const availableMethods = useMemo(() => {
    const used = new Set(
      wallets.filter((w) => w.holderId === holderId).map((w) => w.paymentMethodId),
    )
    return paymentMethods.filter((m) => m.attivo && !used.has(m.id))
  }, [paymentMethods, wallets, holderId])
  const methodOptions = useMemo(
    () => availableMethods.map((m) => ({ value: m.id, label: m.nome })),
    [availableMethods],
  )
  const effectiveMethodId = availableMethods.some((m) => m.id === paymentMethodId)
    ? paymentMethodId
    : (availableMethods[0]?.id ?? '')

  const handleSaveAsync = async () => {
    if (!holderId || !effectiveMethodId) return
    setSaving(true)
    try {
      const iniziale = Number.parseFloat(saldoIniziale.replace(',', '.')) || 0
      await onSave({
        holderId,
        paymentMethodId: effectiveMethodId,
        descrizione,
        saldoIniziale: iniziale,
        stato,
      })
      toast.success('Wallet creato con successo')
      setDescrizione('')
      setSaldoIniziale('')
      onClose()
    } catch (err: unknown) {
      const status = getResponseStatus(err)
      if (status === 409) {
        toast.error('Il collaboratore ha già un wallet per questo metodo di pagamento')
      } else {
        toast.error('Errore durante il salvataggio')
      }
    } finally {
      setSaving(false)
    }
  }

  const canSave = holderId && effectiveMethodId !== '' && !saving

  return (
    <div className="space-y-4 p-4 pt-0 text-sm">
      <div className="space-y-1.5">
        <Label htmlFor="wallet-holder">Collaboratore</Label>
        <SearchableSelect
          id="wallet-holder"
          options={holderOptions}
          value={holderId}
          onChange={setHolderId}
          allowEmpty={false}
          placeholder="Seleziona collaboratore"
          searchPlaceholder="Cerca collaboratore..."
          portalContainer={portalContainer}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="wallet-method">Metodo di pagamento</Label>
        <SearchableSelect
          id="wallet-method"
          options={methodOptions}
          value={effectiveMethodId}
          onChange={setPaymentMethodId}
          allowEmpty={false}
          placeholder="Seleziona metodo"
          searchPlaceholder="Cerca metodo..."
          portalContainer={portalContainer}
        />
        {availableMethods.length === 0 && (
          <p className="text-[11px] text-muted-foreground">
            {paymentMethods.length === 0
              ? 'Nessun metodo di pagamento nel catalogo: un amministratore può aggiungerlo nel backoffice.'
              : 'Il collaboratore ha già un wallet per ogni metodo del catalogo.'}
          </p>
        )}
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
  const wallets = useProfitTrackerStore((s) => s.wallets)
  const paymentMethods = useProfitTrackerStore((s) => s.paymentMethods)
  const fetchPaymentMethods = useProfitTrackerStore((s) => s.fetchPaymentMethods)
  const fetchWallets = useProfitTrackerStore((s) => s.fetchWallets)
  const addWallet = useProfitTrackerStore((s) => s.addWallet)
  const [dropdownPortalEl, setDropdownPortalEl] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    void fetchPaymentMethods()
    void fetchWallets()
  }, [open, fetchPaymentMethods, fetchWallets])

  const handleSave = async (payload: WalletCreatePayload) => {
    await addWallet({
      holderId: payload.holderId,
      paymentMethodId: payload.paymentMethodId,
      descrizione: payload.descrizione || undefined,
      saldoIniziale: payload.saldoIniziale,
      stato: payload.stato,
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
            paymentMethods={paymentMethods}
            wallets={wallets}
            onClose={() => onOpenChange(false)}
            onSave={handleSave}
            portalContainer={dropdownPortalEl}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
